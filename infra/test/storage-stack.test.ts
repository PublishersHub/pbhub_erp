import { App } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../lib/stacks/storage-stack';
import { getEnvConfig } from '../lib/config/env-config';

describe('StorageStack', () => {
  const config = getEnvConfig('dev');
  const app = new App();
  const stack = new StorageStack(app, 'TestStorageStack', {
    config,
    env: { account: '111111111111', region: config.region },
  });
  const template = Template.fromStack(stack);

  it('creates exactly one S3 bucket', () => {
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('names the bucket pbhub-{env}', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: `pbhub-${config.env}`,
    });
  });

  it('enforces SSL with bucket policy', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Deny',
            Action: 's3:*',
            Condition: { Bool: { 'aws:SecureTransport': 'false' } },
          }),
        ]),
      }),
    });
  });

  it('grants public-read on public/* prefix only', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: 'Allow',
            Principal: { AWS: '*' },
            Action: 's3:GetObject',
            Resource: {
              'Fn::Join': ['', [{ 'Fn::GetAtt': [Match.stringLikeRegexp('AppBucket.*'), 'Arn'] }, '/public/*']],
            },
          }),
        ]),
      }),
    });
  });

  it('blocks public ACLs but permits public bucket policies', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      },
    });
  });

  it('configures CORS for the configured web origins', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: Match.arrayWith([
          Match.objectLike({
            AllowedOrigins: config.webOrigins,
          }),
        ]),
      },
    });
  });

  it('creates an IAM user for the api with bucket put/get/delete', () => {
    template.resourceCountIs('AWS::IAM::User', 1);
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['s3:PutObject', 's3:GetObject', 's3:DeleteObject']),
          }),
        ]),
      }),
    });
  });

  it('expires payslip cache after 30 days', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Id: 'expire-payslip-cache',
            Prefix: 'cache/',
            ExpirationInDays: 30,
          }),
        ]),
      },
    });
  });
});
