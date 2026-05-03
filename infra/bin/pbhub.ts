#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getEnvConfig, ENV_CONFIGS, type Environment } from '../lib/config/env-config';
import { StorageStack } from '../lib/stacks/storage-stack';

const app = new App();

// Account ID comes from the active CLI profile (`--profile pb.hub`) at synth time
// via CDK_DEFAULT_ACCOUNT, unless EnvConfig.account pins it.
const account = process.env.CDK_DEFAULT_ACCOUNT;

// Synth all envs by default; pass `--context env=dev` to scope to one.
const targetEnv = (app.node.tryGetContext('env') as Environment | undefined) ?? null;
const envsToSynth: Environment[] = targetEnv ? [targetEnv] : (Object.keys(ENV_CONFIGS) as Environment[]);

for (const envName of envsToSynth) {
  const config = getEnvConfig(envName);
  const env = {
    account: config.account ?? account,
    region: config.region,
  };

  const storage = new StorageStack(app, `PbHub-Storage-${envName}`, { env, config });

  Tags.of(storage).add('Project', 'pbhub-hrms');
  Tags.of(storage).add('Environment', config.env);
  Tags.of(storage).add('ManagedBy', 'cdk');
}

app.synth();
