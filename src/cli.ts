#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { lint } from './index.js';
import type { ValidationError } from './validators.js';

const usage = `Usage: maplint <path>

Validates the source maps found in <path>, which may be a directory to
search or a single source map file.

Options:
  -h, --help  Display this message`;

async function runCLI(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
    },
  });

  if (values.help) {
    console.log(usage);
    return;
  }

  const target = positionals[0];

  if (positionals.length !== 1 || target === undefined) {
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  const result = await lint(target);

  const globalErrors: ValidationError[] = [];
  const errorsByFile = new Map<string, ValidationError[]>();

  for (const error of result.errors) {
    if (error.filePath === undefined) {
      globalErrors.push(error);
      continue;
    }

    const errors = errorsByFile.get(error.filePath);

    if (errors === undefined) {
      errorsByFile.set(error.filePath, [error]);
    } else {
      errors.push(error);
    }
  }

  for (const error of globalErrors) {
    console.error(`error  ${error.message}`);
  }

  for (const [filePath, errors] of errorsByFile) {
    console.error(`\n${filePath}`);

    for (const error of errors) {
      console.error(`  error  ${error.message}`);
    }
  }

  if (result.errors.length > 0) {
    console.error(
      `\nFound ${result.errors.length} error(s) in ${result.sourceMaps.length} source map(s).`,
    );
    process.exitCode = 1;
  }
}

runCLI().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
