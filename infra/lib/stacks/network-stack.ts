import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface NetworkStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * VPC + subnets + NAT for the api/web compute layer.
 * TODO: implement when we move off Docker Compose to ECS Fargate / Beanstalk.
 *   - 2 AZ public + private subnets
 *   - Single NAT (cost-optimized) for non-prod, dual-NAT for prod
 *   - VPC endpoints for S3 / Secrets Manager / RDS to avoid NAT egress
 */
export class NetworkStack extends Stack {
  constructor(scope: Construct, id: string, props: NetworkStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
