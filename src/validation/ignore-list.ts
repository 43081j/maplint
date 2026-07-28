import type { ValidationError, Validator } from './types.js';

/**
 * Validates that every entry of "ignoreList" is an integer which indexes into
 * "sources".
 */
export const ignoreListValidator: Validator = (file) => {
  const { ignoreList, sources } = file.map;

  if (ignoreList === undefined) {
    return [];
  }

  const errors: ValidationError[] = [];

  for (const [i, entry] of ignoreList.entries()) {
    if (!Number.isInteger(entry)) {
      errors.push({
        filePath: file.path,
        message: `"ignoreList[${i}]" must be an integer, but is ${entry}`,
      });
      continue;
    }

    if (entry < 0 || entry >= sources.length) {
      errors.push({
        filePath: file.path,
        message: `"ignoreList[${i}]" is ${entry}, which is not an index into "sources"`,
      });
    }
  }

  return errors;
};
