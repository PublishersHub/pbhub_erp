#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getEnvConfig, ENV_CONFIGS, type Environment } from '../lib/config/env-config';
import { StorageStack } from '../lib/stacks/storage-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';

const app = new App();

// Account ID comes from EnvConfig.account, falling back to the active CLI
// profile (`--profile pb.hub`) via CDK_DEFAULT_ACCOUNT at synth time.
const fallbackAccount = process.env.CDK_DEFAULT_ACCOUNT;

// Synth all envs by default; pass `--context env=prod` to scope to one.
const targetEnv = (app.node.tryGetContext('env') as Environment | undefined) ?? null;
const envsToSynth: Environment[] = targetEnv ? [targetEnv] : (Object.keys(ENV_CONFIGS) as Environment[]);

for (const envName of envsToSynth) {
  const config = getEnvConfig(envName);
  const env = {
    account: config.account ?? fallbackAccount,
    region: config.region,
  };

  const storage = new StorageStack(app, `HrSystem-Storage-${envName}`, { env, config });

  // Compute is only deployed in envs that opted in via env-config.compute.
  if (config.compute) {
    const compute = new ComputeStack(app, `HrSystem-Compute-${envName}`, {
      env,
      config,
      bucketName: storage.bucket.bucketName,
    });
    compute.addDependency(storage);
  }

  Tags.of(storage).add('Project', 'hr-system');
  Tags.of(storage).add('Environment', config.env);
  Tags.of(storage).add('ManagedBy', 'cdk');
}

app.synth();
