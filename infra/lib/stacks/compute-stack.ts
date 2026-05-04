import { Stack, StackProps, CfnOutput, Tags, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SubnetType,
  SecurityGroup,
  Peer,
  Port,
  Instance,
  InstanceType,
  MachineImage,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  CfnEIP,
  CfnEIPAssociation,
  UserData,
  CpuCredits,
} from 'aws-cdk-lib/aws-ec2';
import {
  Role,
  ServicePrincipal,
  ManagedPolicy,
  PolicyStatement,
  Effect,
} from 'aws-cdk-lib/aws-iam';
import { HostedZone, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import type { EnvConfig } from '../config/env-config';

interface ComputeStackProps extends StackProps {
  config: EnvConfig;
  /** Bucket name to grant the instance read/write on (from StorageStack). */
  bucketName: string;
}

/**
 * Single EC2 instance running the full Docker Compose stack.
 *
 *   - Default VPC, default subnet (no NAT cost, public IP via Elastic IP)
 *   - t4g.medium (ARM Graviton) Ubuntu 24.04 LTS
 *   - 8 GB root + 30 GB gp3 data volume mounted at /data
 *   - Security group: 22 (SSM Session Manager preferred), 80, 443
 *   - IAM role: SSM Session Manager + read/write on the storage bucket
 *   - Elastic IP allocated and associated
 *   - Route 53 A record pointing the configured domain at the EIP
 *   - User data installs Docker, mounts /data, configures swap + log rotation,
 *     and leaves the instance ready for `git clone + docker compose up`.
 */
export class ComputeStack extends Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const { config, bucketName } = props;
    if (!config.compute) {
      throw new Error(`Env ${config.env} has no compute config — populate it in env-config.ts`);
    }
    const { domain, hostedZoneName, instanceType, dataVolumeSizeGib, sshAllowedCidr } = config.compute;

    // Use the default VPC — free, has public subnets, no NAT needed for an
    // internet-facing single host.
    const vpc = Vpc.fromLookup(this, 'DefaultVpc', { isDefault: true });

    // ─── Security group ──────────────────────────────────────────────────────
    const securityGroup = new SecurityGroup(this, 'AppSecurityGroup', {
      vpc,
      description: 'hr-system app - 80/443 public, 22 from configured CIDR',
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(
      Peer.ipv4(sshAllowedCidr ?? '0.0.0.0/0'),
      Port.tcp(22),
      'SSH (prefer SSM Session Manager - restrict this in prod)',
    );
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'HTTP (LetsEncrypt + redirect)');
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'HTTPS');

    // ─── IAM role: SSM + S3 ──────────────────────────────────────────────────
    const role = new Role(this, 'InstanceRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      description: 'EC2 instance role for hr-system host (SSM + S3 + CloudWatch logs)',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // Look up the existing storage bucket (deployed by StorageStack) and grant
    // the instance read/write on it. This replaces the long-lived IAM access
    // keys created by StorageStack — the instance gets credentials via IMDS
    // automatically. S3 SDK falls back to that when env vars aren't set.
    const bucket = Bucket.fromBucketName(this, 'AppBucket', bucketName);
    bucket.grantReadWrite(role);
    role.addToPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketLocation'],
      resources: [bucket.bucketArn],
    }));

    // ─── User data — runs once on first boot ─────────────────────────────────
    const userData = UserData.forLinux();
    userData.addCommands(...buildUserDataCommands());

    // ─── EC2 instance ────────────────────────────────────────────────────────
    const instance = new Instance(this, 'AppInstance', {
      vpc,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
      instanceType: new InstanceType(instanceType),
      // Latest Ubuntu 24.04 LTS for arm64 (Canonical SSM parameter — region-aware)
      machineImage: MachineImage.fromSsmParameter(
        '/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id',
      ),
      securityGroup,
      role,
      userData,
      // 8 GB root + 30 GB second volume bind-mounted into Docker at /data.
      blockDevices: [
        {
          deviceName: '/dev/sda1', // root
          volume: BlockDeviceVolume.ebs(8, {
            volumeType: EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
        {
          deviceName: '/dev/sdf', // data — appears as /dev/nvme1n1 inside Linux
          volume: BlockDeviceVolume.ebs(dataVolumeSizeGib, {
            volumeType: EbsDeviceVolumeType.GP3,
            encrypted: true,
            // KEEP on terminate so accidental termination doesn't lose the DB.
            // To genuinely tear down, detach + delete via `aws ec2 delete-volume` after.
            deleteOnTermination: false,
          }),
        },
      ],
      requireImdsv2: true, // metadata v2 only — required by SDK + safer
      detailedMonitoring: false, // saves ~$2/mo; standard 5-min metrics are enough
      // CPU credit mode for t-series. UNLIMITED can incur surprise charges if
      // CPU sustains >baseline; STANDARD throttles instead. Default to STANDARD.
      creditSpecification: CpuCredits.STANDARD,
    });

    // ─── Elastic IP ──────────────────────────────────────────────────────────
    const eip = new CfnEIP(this, 'AppEip', {
      domain: 'vpc',
      tags: [{ key: 'Name', value: `hr-system-${config.env}` }],
    });
    new CfnEIPAssociation(this, 'AppEipAssoc', {
      allocationId: eip.attrAllocationId,
      instanceId: instance.instanceId,
    });

    // ─── Route 53 A record ───────────────────────────────────────────────────
    const zone = HostedZone.fromLookup(this, 'AppHostedZone', { domainName: hostedZoneName });
    new ARecord(this, 'AppAliasRecord', {
      zone,
      recordName: domain, // CDK strips the zone suffix automatically
      target: RecordTarget.fromIpAddresses(eip.ref),
      ttl: Duration.minutes(5),
    });

    // ─── Tags ────────────────────────────────────────────────────────────────
    Tags.of(this).add('Project', 'hr-system');
    Tags.of(this).add('Environment', config.env);
    Tags.of(this).add('ManagedBy', 'cdk');

    // ─── Outputs ─────────────────────────────────────────────────────────────
    new CfnOutput(this, 'InstanceId', { value: instance.instanceId, description: 'EC2 instance ID — connect with `aws ssm start-session --target ...`' });
    new CfnOutput(this, 'PublicIp', { value: eip.ref, description: 'Elastic IP attached to the instance' });
    new CfnOutput(this, 'Domain', { value: `https://${domain}`, description: 'Public URL once Let\'s Encrypt + nginx are up' });
    new CfnOutput(this, 'SsmSessionCommand', { value: `aws ssm start-session --target ${instance.instanceId} --profile pb.hub`, description: 'Command to open a shell on the instance (no SSH key needed)' });
  }
}

/**
 * The cloud-init script that runs once on first boot. Idempotent — safe even if
 * cloud-init replays it. Mirrors deploy/scripts/bootstrap-host.sh but inlined
 * here so the instance is ready straight from launch.
 */
function buildUserDataCommands(): string[] {
  return [
    `set -euxo pipefail`,
    `exec > /var/log/hr-system-userdata.log 2>&1`,

    // Update + base packages
    `export DEBIAN_FRONTEND=noninteractive`,
    `apt-get update -y`,
    `apt-get install -y ca-certificates curl gnupg lsb-release ufw fail2ban git unzip jq`,

    // Docker engine + compose plugin (official APT repo)
    `install -m 0755 -d /etc/apt/keyrings`,
    `curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg`,
    `chmod a+r /etc/apt/keyrings/docker.gpg`,
    `echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list`,
    `apt-get update -y`,
    `apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin`,
    `usermod -aG docker ubuntu`,

    // Docker log rotation
    `mkdir -p /etc/docker`,
    `cat > /etc/docker/daemon.json <<'JSON'
{"log-driver":"json-file","log-opts":{"max-size":"10m","max-file":"3"}}
JSON`,
    `systemctl restart docker`,

    // Mount the data EBS volume (block device name varies on Nitro/non-Nitro;
    // probe both). We never reformat if it already has a filesystem.
    `DATA_DEV=$(lsblk -ndo NAME,SIZE,MOUNTPOINT | awk '$2 ~ /[0-9]+G/ && $2 != "8G" && $3 == "" { print "/dev/" $1; exit }')`,
    `if [ -n "$DATA_DEV" ]; then
       if ! blkid "$DATA_DEV" >/dev/null 2>&1; then
         mkfs.ext4 -L hr-system-data "$DATA_DEV"
       fi
       mkdir -p /data
       mountpoint -q /data || mount "$DATA_DEV" /data
       UUID=$(blkid -s UUID -o value "$DATA_DEV")
       grep -q "$UUID" /etc/fstab || echo "UUID=$UUID  /data  ext4  defaults,nofail  0  2" >> /etc/fstab
     fi`,

    // Subdirectories the compose stack expects
    `mkdir -p /data/postgres /data/redis /data/letsencrypt /data/certbot-www /data/backups`,
    `chown -R 70:70 /data/postgres`,
    `chmod 700 /data/redis`,

    // 2 GB swap
    `if [ ! -f /swapfile ]; then
       fallocate -l 2G /swapfile
       chmod 600 /swapfile
       mkswap /swapfile
       swapon /swapfile
       echo "/swapfile none swap sw 0 0" >> /etc/fstab
     fi`,

    // UFW firewall (security group is the real defense; UFW is belt+suspenders)
    `ufw allow 22/tcp`,
    `ufw allow 80/tcp`,
    `ufw allow 443/tcp`,
    `ufw --force enable`,

    // Fail2ban
    `systemctl enable --now fail2ban`,

    // Marker file so the user knows user-data finished
    `touch /var/log/hr-system-userdata.done`,
    `echo "user-data finished at $(date -Iseconds)" > /etc/motd`,
  ];
}
