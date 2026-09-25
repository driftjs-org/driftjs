#!/usr/bin/env node

import { runCli } from '../dist/index-es.js';

runCli().catch((err) => {
  console.error(err);
  process.exit(1);
});
