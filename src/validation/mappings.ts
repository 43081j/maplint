import { decode } from '@jridgewell/sourcemap-codec';
import type { ValidationError, Validator } from './types.js';

const invalidCharacter = /[^A-Za-z0-9+/,;]/;

/**
 * Validates the segments of "mappings": that they are ordered, and that they
 * reference sources and names which exist.
 */
export const mappingsValidator: Validator = (file) => {
  const { mappings, sources, names = [] } = file.map;

  const invalidMatch = invalidCharacter.exec(mappings);

  // Decoding silently discards anything it doesn't understand, so the string
  // is checked for stray characters before the segments are looked at.
  if (invalidMatch) {
    return [
      {
        filePath: file.path,
        message:
          `"mappings" contains "${invalidMatch[0]}" at offset ` +
          `${invalidMatch.index}, which is not valid base64 VLQ`,
      },
    ];
  }

  const errors: ValidationError[] = [];

  for (const [line, segments] of decode(mappings).entries()) {
    for (const segment of segments) {
      const generatedColumn = segment[0];
      // Lines are one-based when reported, to match how the generated file is
      // displayed by editors and stack traces.
      const at = `line ${line + 1}, column ${generatedColumn}`;

      if (generatedColumn < 0) {
        errors.push({
          filePath: file.path,
          message: `"mappings" has a segment on line ${line + 1} with a negative generated column (${generatedColumn})`,
        });
      }

      if (segment.length !== 1) {
        const [, sourceIndex, originalLine, originalColumn] = segment;

        if (sourceIndex < 0 || sourceIndex >= sources.length) {
          errors.push({
            filePath: file.path,
            message: `"mappings" has a segment at ${at} referencing "sources[${sourceIndex}]", which does not exist`,
          });
        }

        if (originalLine < 0 || originalColumn < 0) {
          errors.push({
            filePath: file.path,
            message: `"mappings" has a segment at ${at} pointing at a negative position in its source (${originalLine}:${originalColumn})`,
          });
        }
      }

      if (segment.length === 5) {
        const nameIndex = segment[4];

        if (nameIndex < 0 || nameIndex >= names.length) {
          errors.push({
            filePath: file.path,
            message: `"mappings" has a segment at ${at} referencing "names[${nameIndex}]", which does not exist`,
          });
        }
      }
    }
  }

  return errors;
};
