import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface ComputeStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * Application compute (api + web).
 * TODO: implement when we deploy.
 *   - ECS Fargate cluster, two services:
 *     - api: 0.5 vCPU / 1 GB, container from apps/api Dockerfile
 *     - web: 0.25 vCPU / 0.5 GB, container from apps/web Dockerfile (or Vercel)
 *   - ALB in front, target groups for /api/* and /*
 *   - Task role grants S3 access to the bucket from StorageStack
 *   - Auto-scaling on CPU > 70% (min 1, max 4)
 */
export class ComputeStack extends Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
