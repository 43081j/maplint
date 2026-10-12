import { describe, expect, test } from 'vitest';
import {
  ignoreListValidator,
  mappingsValidator,
  SEVERITY_ERROR,
  SEVERITY_WARN,
  sourceFilesValidator,
} from 'maplint';
import type {
  Severity,
  SourceMap,
  SourceMapFile,
  ValidationMessage,
  Validator,
} from 'maplint';

describe('public validators', () => {
  const map: SourceMap = {
    version: 3,
    sources: ['input.ts'],
    mappings: 'AAAA',
    ignoreList: [0],
  };
  const file: SourceMapFile = { path: 'in-memory.js.map', map };
  const validators: Validator[] = [mappingsValidator, ignoreListValidator];

  test('validates an in-memory map with selected pure validators', async () => {
    expect(
      await Promise.all(validators.map((validate) => validate(file))),
    ).toEqual([[], []]);
  });

  test('returns diagnostics for an in-memory map', async () => {
    const invalidFile: SourceMapFile = {
      ...file,
      map: { ...map, sources: [] },
    };
    const severity: Severity = SEVERITY_ERROR;
    const messages: ValidationMessage[] = (
      await Promise.all(validators.map((validate) => validate(invalidFile)))
    ).flat();

    expect(messages).toEqual([
      {
        filePath: file.path,
        severity,
        message:
          '"mappings" has a segment at line 1, column 0 referencing "sources[0]", which does not exist',
      },
      {
        filePath: file.path,
        severity,
        message: '"ignoreList[0]" is 0, which is not an index into "sources"',
      },
    ]);
  });

  test('exports the source files validator and warning severity', async () => {
    expect(
      await sourceFilesValidator({
        ...file,
        map: { ...map, sourcesContent: ['export {};'] },
      }),
    ).toEqual([]);
    expect(SEVERITY_WARN).toBe(1);
    expect(SEVERITY_ERROR).toBe(2);
  });
});
