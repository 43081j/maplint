#!/usr/bin/env node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { lint } from './index.js';
import type { LintResult } from './index.js';
import { downloadPackage } from './npm.js';
import type { ValidationError } from './validation/types.js';

const usage = `Usage: maplint [options] <path>

Validates the source maps found in <path>, which may be a directory to
search or a single source map file.

Options:
      --npm   Treat <path> as an npm package spec (e.g. "foo" or "foo@3"),
              validating the source maps published in its tarball
  -h, --help  Display this message`;

/**
 * Rewrites the source map paths in a result to be relative to `base`.
 */
function convertPathsToRelative(result: LintResult, base: string): LintResult {
  return {
    errors: result.errors.map((error) =>
      error.filePath === undefined
        ? error
        : {
            filePath: path.relative(base, error.filePath),
            message: error.message,
          },
    ),
    sourceMaps: result.sourceMaps.map((sourceMap) =>
      path.relative(base, sourceMap),
    ),
  };
}

async function runCLI(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      npm: { type: 'boolean' },
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

  let result: LintResult;

  if (values.npm) {
    const dest = await mkdtemp(path.join(tmpdir(), 'maplint-'));

    try {
      const id = await downloadPackage(target, dest);

      console.log(`Validating source maps in ${id}`);

      result = convertPathsToRelative(await lint(dest), dest);
    } finally {
      await rm(dest, { force: true, recursive: true });
    }
  } else {
    result = await lint(target);
  }

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

runCLI().catch((err: unknown) => {
  console.error(`error  ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
