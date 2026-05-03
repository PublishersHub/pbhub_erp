import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { EnvConfig } from '../config/env-config';

interface DnsStackProps extends StackProps {
  config: EnvConfig;
}

/**
 * Route53 hosted zone + ACM certificates.
 * TODO: implement when domain is ready.
 *   - Hosted zone (or imported from a parent zone if pbhub is a subdomain)
 *   - ACM cert for api.* / app.* / cdn.* (us-east-1 for CloudFront, regional for ALB)
 *   - DNS records pointing to ALB (compute) and CloudFront (cdn)
 */
export class DnsStack extends Stack {
  constructor(scope: Construct, id: string, props: DnsStackProps) {
    super(scope, id, props);
    // intentionally empty — see TODO above
  }
}
