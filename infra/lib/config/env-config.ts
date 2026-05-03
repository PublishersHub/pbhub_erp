/**
 * Per-environment configuration for CDK stacks.
 *
 * The AWS account ID and region are picked up from the active CLI profile
 * (e.g. `--profile pb.hub`) via CDK_DEFAULT_ACCOUNT/CDK_DEFAULT_REGION at synth time,
 * unless overridden here. Hardcode account IDs once you bootstrap real AWS accounts
 * so synth is environment-deterministic and not dependent on whoever is running it.
 */

export type Environment = 'dev' | 'staging' | 'prod';

export interface EnvConfig {
  /** Logical name used in stack IDs and tags. */
  env: Environment;
  /** AWS region for all stacks in this env. */
  region: string;
  /** AWS account ID. Leave undefined to fall back to the active CLI profile. */
  account?: string;
  /**
   * Allowed origins for the storage bucket's CORS policy.
   * Used by the browser to PUT directly to S3 via presigned URLs and to GET via signed download URLs.
   */
  webOrigins: string[];
  /**
   * The DNS name where the API serves itself, used for CORS and CloudFront origin config later.
   * Leave blank until DNS is provisioned.
   */
  apiDomain?: string;
  /** Removal policy hint — `destroy` for dev (data is disposable), `retain` for prod. */
  removalPolicy: 'destroy' | 'retain';
  /** Apply versioning to the storage bucket. Recommended for prod. */
  bucketVersioning: boolean;
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
    webOrigins: ['https://staging.pbhub.example'],
    apiDomain: 'api-staging.pbhub.example',
    removalPolicy: 'retain',
    bucketVersioning: true,
  },
  prod: {
    env: 'prod',
    region: REGION,
    webOrigins: ['https://pbhub.example'],
    apiDomain: 'api.pbhub.example',
    removalPolicy: 'retain',
    bucketVersioning: true,
  },
};

export function getEnvConfig(env: Environment): EnvConfig {
  const cfg = ENV_CONFIGS[env];
  if (!cfg) {
    throw new Error(`Unknown environment: ${env}`);
  }
  return cfg;
}
