#!/usr/bin/env node

import { runCli } from '../src/cli.js';

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
