import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface CdnStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * CloudFront in front of the public/* prefix of the storage bucket.
 * TODO: implement when egress costs justify it (~$50+/mo of branding traffic).
 *   - Origin: S3 bucket with OAC (origin access control), restricted to /public/*
 *   - Behavior: GET only, long max-age (1 year), gzip+brotli
 *   - Custom domain (cdn.pbhub.example) with ACM cert in us-east-1
 */
export class CdnStack extends Stack {
  constructor(scope: Construct, id: string, props: CdnStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
