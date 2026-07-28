import { readFile } from 'node:fs/promises';
import * as v from 'valibot';
import { ignoreListValidator } from './ignore-list.js';
import { mappingsValidator } from './mappings.js';
import { sourceFilesValidator } from './source-files.js';
import { SourceMapFileSchema } from './types.js';
import type { SourceMapFile, ValidationError, Validator } from './types.js';

const validators: Validator[] = [
  ignoreListValidator,
  mappingsValidator,
  sourceFilesValidator,
];

/**
 * Loads and validates a single source map.
 */
export async function validateFile(
  filePath: string,
): Promise<ValidationError[]> {
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

  const results = await Promise.all(
    validators.map((validator) => validator(file)),
  );

  return results.flat();
}
