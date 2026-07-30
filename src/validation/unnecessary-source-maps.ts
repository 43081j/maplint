import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { SEVERITY_WARN } from './types.js';
import type { ProjectValidator, ValidationMessage } from './types.js';

const tsdownSourcemapPattern = /\bsourcemap\s*:\s*([^,\s}]+)/;
const tsdownMinifyPattern = /\bminify\s*:\s*([^,\s}]+)/;

const DEFAULT_WARNING =
  'Source maps are enabled but minification is not, so the output should ' +
  'already be readable without them. Consider disabling source maps';

type ConfigMatcher = (cwd: string) => Promise<ValidationMessage[]>;

const tsdownMatcher: ConfigMatcher = async (cwd) => {
  const configPath = path.join(cwd, 'tsdown.config.ts');
  let contents: string;

  try {
    contents = await readFile(configPath, 'utf8');
  } catch {
    return [];
  }

  const sourcemap = tsdownSourcemapPattern.exec(contents)?.[1];

  if (sourcemap === undefined || sourcemap === 'false') {
    return [];
  }

  const minify = tsdownMinifyPattern.exec(contents)?.[1];

  // Minification is disabled by default, so an absent option is the same as
  // it being set to false.
  if (minify !== undefined && minify !== 'false') {
    return [];
  }

  return [
    {
      filePath: configPath,
      severity: SEVERITY_WARN,
      message: DEFAULT_WARNING,
    },
  ];
};

const matchers: ConfigMatcher[] = [tsdownMatcher];

/**
 * Validates that source maps are worth producing at all: unminified output is
 * close enough to its sources that a source map adds little over the output
 * itself.
 */
export const unnecessarySourceMapsValidator: ProjectValidator = async (cwd) => {
  const results = await Promise.all(matchers.map((matcher) => matcher(cwd)));

  return results.flat();
};
