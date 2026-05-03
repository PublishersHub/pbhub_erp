import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface DataStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * RDS Postgres + ElastiCache Redis.
 * TODO: implement when we deploy.
 *   - RDS Postgres 16, single-AZ for dev, multi-AZ for prod
 *   - ElastiCache Redis 7, single node for dev, replication group for prod
 *   - Secrets Manager for DB credentials, rotation via Lambda
 *   - Snapshot retention 7 days (dev) / 30 days (prod)
 */
export class DataStack extends Stack {
  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
