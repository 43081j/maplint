import { glob, readFile, stat } from 'node:fs/promises';
import * as path from 'node:path';
import * as v from 'valibot';
import { SourceMapFileSchema, validators } from './validators.js';
import type { SourceMapFile, ValidationError } from './validators.js';

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

/**
 * Loads and validates a single source map.
 */
async function validateFile(filePath: string): Promise<ValidationError[]> {
  let contents: unknown;

  try {
    contents = JSON.parse(await readFile(filePath, 'utf8'));
  } catch (err) {
    return [
      {
        filePath,
        message: `Failed to read source map: ${(err as Error).message}`,
      },
    ];
  }

  const result = v.safeParse(SourceMapFileSchema, {
    path: filePath,
    map: contents,
  });

  if (!result.success) {
    return result.issues.map((issue) => ({
      filePath,
      message: `${v.getDotPath(issue) ?? '<root>'}: ${issue.message}`,
    }));
  }

  const file: SourceMapFile = result.output;

  return validators.flatMap((validator) => validator(file));
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
