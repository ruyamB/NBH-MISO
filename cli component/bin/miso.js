#!/usr/bin/env node
import { runCLI } from '../src/cli.js';

runCLI().catch((err) => {
  console.error('\x1b[31mFatal error:\x1b[0m', err);
  process.exit(1);
});
