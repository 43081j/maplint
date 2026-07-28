import { access } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ValidationError, Validator } from './types.js';

const schemePattern = /^[a-z][a-z0-9+.-]+:/i;

/**
 * Computes the path a source resolves to on disk, or null if it is a URL
 * pointing somewhere which cannot be read locally.
 */
function resolveSourcePath(
  mapPath: string,
  sourceRoot: string,
  source: string,
): string | null {
  if (source.startsWith('file:')) {
    return fileURLToPath(source);
  }

  if (schemePattern.test(source)) {
    return null;
  }

  return path.join(path.dirname(mapPath), sourceRoot, source);
}

/**
 * Validates that each source is available, either as an entry in
 * "sourcesContent" or as a file on disk.
 */
export const sourceFilesValidator: Validator = async (file) => {
  const { sources, sourcesContent, sourceRoot = '' } = file.map;

  const errors = await Promise.all(
    sources.map(async (source, i): Promise<ValidationError | null> => {
      // A null source has no path to resolve, and a source with inline
      // contents doesn't need one.
      if (source === null || sourcesContent?.[i] != null) {
        return null;
      }

      const sourcePath = resolveSourcePath(file.path, sourceRoot, source);

      // Sources behind a URL can't be resolved locally, so are left to the
      // consumer of the source map to fetch.
      if (sourcePath === null) {
        return null;
      }

      try {
        await access(sourcePath);
        return null;
      } catch {
        return {
          filePath: file.path,
          message: `"sources[${i}]" contained the path "${sourcePath}" which could not be found`,
        };
      }
    }),
  );

  return errors.filter((error) => error !== null);
};
