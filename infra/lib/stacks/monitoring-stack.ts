import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface MonitoringStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * CloudWatch alarms, log groups, dashboards.
 * TODO: implement after compute is deployed.
 *   - Log groups for api/web ECS services with 30-day retention
 *   - Alarms: 5xx rate > 1%, p95 latency > 1s, RDS CPU > 80%, S3 4xx spike
 *   - SNS topic → email/Slack on alarm
 *   - One dashboard combining api + db + s3 metrics
 */
export class MonitoringStack extends Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
