/**
 * Per-environment configuration for CDK stacks.
 *
 * The AWS account ID and region are picked up from the active CLI profile
 * (e.g. `--profile pb.hub`) via CDK_DEFAULT_ACCOUNT/CDK_DEFAULT_REGION at synth time,
 * unless overridden here.
 */

export type Environment = 'dev' | 'staging' | 'prod';

export interface ComputeConfig {
  /** Subdomain to host the app at, e.g. `hr.cloudxbloom.com`. */
  domain: string;
  /** Parent hosted zone in Route53 (must already exist). */
  hostedZoneName: string;
  /** EC2 instance type. ARM = t4g.* (cheaper, ~20% less). */
  instanceType: string;
  /** GiB for the data EBS volume mounted at /data. */
  dataVolumeSizeGib: number;
  /** Optional CIDR range allowed to SSH/SSM to the instance. Defaults to 0.0.0.0/0 — restrict in prod. */
  sshAllowedCidr?: string;
}

export interface EnvConfig {
  env: Environment;
  region: string;
  account?: string;
  webOrigins: string[];
  removalPolicy: 'destroy' | 'retain';
  bucketVersioning: boolean;
  /** Compute stack settings — present only for envs we deploy app infra into. */
  compute?: ComputeConfig;
}

const REGION = 'us-east-1';

export const ENV_CONFIGS: Record<Environment, EnvConfig> = {
  dev: {
    env: 'dev',
    region: REGION,
    webOrigins: ['http://localhost:3000', 'http://localhost:3001'],
    removalPolicy: 'destroy',
    bucketVersioning: false,
  },
  staging: {
    env: 'staging',
    region: REGION,
    webOrigins: ['https://staging.hr-system.example'],
    removalPolicy: 'retain',
    bucketVersioning: true,
  },
  prod: {
    env: 'prod',
    region: REGION,
    account: '763701915116',
    webOrigins: ['https://hr.cloudxbloom.com'],
    removalPolicy: 'retain',
    bucketVersioning: true,
    compute: {
      domain: 'hr.cloudxbloom.com',
      hostedZoneName: 'cloudxbloom.com',
      instanceType: 't4g.medium',
      dataVolumeSizeGib: 30,
    },
  },
};

export function getEnvConfig(env: Environment): EnvConfig {
  const cfg = ENV_CONFIGS[env];
  if (!cfg) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return cfg;
}
