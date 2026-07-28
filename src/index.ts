import { glob, stat } from 'node:fs/promises';
import * as path from 'node:path';
import type { ValidationError } from './validators.js';
import { validateFile } from './validate.js';

const DEFAULT_IGNORES = new Set(['node_modules']);

const isIgnored = (name: string): boolean => DEFAULT_IGNORES.has(name);

/**
 * Finds all source maps in a given path, which may be a directory to
 * search or a single source map file.
 */
async function findSourceMaps(target: string): Promise<string[]> {
  const stats = await stat(target);

  if (!stats.isDirectory()) {
    return [target];
  }

  const results: string[] = [];

  for await (const match of glob('**/*.map', {
    cwd: target,
    exclude: isIgnored,
  })) {
    results.push(path.join(target, match));
  }

  return results;
}

export interface LintResult {
  errors: ValidationError[];
  sourceMaps: string[];
}

export async function lint(target: string): Promise<LintResult> {
  const results: LintResult = {
    errors: [],
    sourceMaps: [],
  };

  try {
    results.sourceMaps = await findSourceMaps(target);
  } catch (err) {
    results.errors.push({
      message: `Failed to read "${target}": ${(err as Error).message}`,
    });
    return results;
  }

  await Promise.all(
    results.sourceMaps.map(async (sourceMap) => {
      const result = await validateFile(sourceMap);
      if (result.length > 0) {
        for (const error of result) {
          results.errors.push(error);
        }
      }
    }),
  );

  return results;
}
