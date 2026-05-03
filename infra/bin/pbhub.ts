#!/usr/bin/env node
import 'source-map-support/register';
import { App, Tags } from 'aws-cdk-lib';
import { getEnvConfig, ENV_CONFIGS, type Environment } from '../lib/config/env-config';
import { StorageStack } from '../lib/stacks/storage-stack';
import { NetworkStack } from '../lib/stacks/network-stack';
import { DataStack } from '../lib/stacks/data-stack';
import { ComputeStack } from '../lib/stacks/compute-stack';
import { CdnStack } from '../lib/stacks/cdn-stack';
import { DnsStack } from '../lib/stacks/dns-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';

const app = new App();

// ─── Account resolution ──────────────────────────
// Account ID comes from the active CLI profile (`--profile pb.hub`) at synth time
// via CDK_DEFAULT_ACCOUNT. To pin the account explicitly per env, set it on
// EnvConfig.account in env-config.ts.
const account = process.env.CDK_DEFAULT_ACCOUNT;

// ─── Per-env stack wiring ────────────────────────
// Synthesize all envs but only deploy the one(s) you target with --filter.
const targetEnv = (app.node.tryGetContext('env') as Environment | undefined) ?? null;
const envsToSynth: Environment[] = targetEnv ? [targetEnv] : (Object.keys(ENV_CONFIGS) as Environment[]);

for (const envName of envsToSynth) {
  const config = getEnvConfig(envName);
  const env = {
    account: config.account ?? account,
    region: config.region,
  };

  const tags: Record<string, string> = {
    Project: 'pbhub-hrms',
    Environment: config.env,
    ManagedBy: 'cdk',
  };

  // Storage — the only stack with concrete resources today.
  const storage = new StorageStack(app, `PbHub-Storage-${envName}`, { env, config });

  // The rest are scaffolds; instantiating them produces empty stacks that synth cleanly.
  // Comment out any stack you don't want to synth yet.
  const network = new NetworkStack(app, `PbHub-Network-${envName}`, { env, config });
  const data = new DataStack(app, `PbHub-Data-${envName}`, { env, config });
  const compute = new ComputeStack(app, `PbHub-Compute-${envName}`, { env, config });
  const cdn = new CdnStack(app, `PbHub-Cdn-${envName}`, { env, config });
  const dns = new DnsStack(app, `PbHub-Dns-${envName}`, { env, config });
  const monitoring = new MonitoringStack(app, `PbHub-Monitoring-${envName}`, { env, config });

  for (const stack of [storage, network, data, compute, cdn, dns, monitoring]) {
    for (const [k, v] of Object.entries(tags)) {
      Tags.of(stack).add(k, v);
    }
  }
}

app.synth();
