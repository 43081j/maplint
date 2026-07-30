#!/usr/bin/env node

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { lint } from './index.js';
import type { LintResult } from './index.js';
import { downloadPackage } from './npm.js';
import { SEVERITY_ERROR, SEVERITY_WARN } from './validation/types.js';
import type { ValidationMessage } from './validation/types.js';

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
    messages: result.messages.map((message) =>
      message.filePath === undefined
        ? message
        : {
            ...message,
            filePath: path.relative(base, message.filePath),
          },
    ),
    sourceMaps: result.sourceMaps.map((sourceMap) =>
      path.relative(base, sourceMap),
    ),
  };
}

function formatSeverity(message: ValidationMessage): string {
  return (message.severity === SEVERITY_ERROR ? 'error' : 'warning').padEnd(7);
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
    result = await lint(target, { cwd: process.cwd() });
  }

  const globalMessages: ValidationMessage[] = [];
  const messagesByFile = new Map<string, ValidationMessage[]>();

  for (const message of result.messages) {
    if (message.filePath === undefined) {
      globalMessages.push(message);
      continue;
    }

    const messages = messagesByFile.get(message.filePath);

    if (messages === undefined) {
      messagesByFile.set(message.filePath, [message]);
    } else {
      messages.push(message);
    }
  }

  for (const message of globalMessages) {
    console.error(`${formatSeverity(message)}  ${message.message}`);
  }

  for (const [filePath, messages] of messagesByFile) {
    console.error(`\n${filePath}`);

    for (const message of messages) {
      console.error(`  ${formatSeverity(message)}  ${message.message}`);
    }
  }

  const errorCount = result.messages.filter(
    (message) => message.severity === SEVERITY_ERROR,
  ).length;
  const warningCount = result.messages.filter(
    (message) => message.severity === SEVERITY_WARN,
  ).length;

  if (result.messages.length > 0) {
    const counts = [
      ...(errorCount > 0 ? [`${errorCount} error(s)`] : []),
      ...(warningCount > 0 ? [`${warningCount} warning(s)`] : []),
    ];

    console.error(
      `\nFound ${counts.join(' and ')} in ${result.sourceMaps.length} source map(s).`,
    );
  } else if (result.sourceMaps.length === 0) {
    console.log('No source maps found.');
  } else {
    console.log(
      `No problems found in ${result.sourceMaps.length} source map(s).`,
    );
  }

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

runCLI().catch((err: unknown) => {
  console.error(`error  ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
});
