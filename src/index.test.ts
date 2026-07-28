import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { lint } from './index.js';
import type { LintResult } from './index.js';

const fixturesDir = path.relative(
  process.cwd(),
  path.join(import.meta.dirname, '..', 'test', 'fixtures'),
);

/**
 * Lints a fixture, sorting the result so it can be snapshotted regardless of
 * the order in which the source maps happened to be validated.
 */
async function lintFixture(name: string): Promise<LintResult> {
  const result = await lint(path.join(fixturesDir, name));

  return {
    sourceMaps: [...result.sourceMaps].sort(),
    errors: [...result.errors].sort((a, b) =>
      `${a.filePath}${a.message}`.localeCompare(`${b.filePath}${b.message}`),
    ),
  };
}

describe('lint', () => {
  test('valid map with external sources', async () => {
    expect(await lintFixture('valid-external-sources')).toMatchSnapshot();
  });

  test('valid map with inline sources', async () => {
    expect(await lintFixture('valid-inline-sources')).toMatchSnapshot();
  });

  test('map with an unresolved source path', async () => {
    expect(await lintFixture('unresolved-source')).toMatchSnapshot();
  });

  test('map which does not match the source map schema', async () => {
    expect(await lintFixture('invalid-shape')).toMatchSnapshot();
  });

  test('map which is not valid JSON', async () => {
    expect(await lintFixture('malformed-json')).toMatchSnapshot();
  });

  test('single source map file', async () => {
    expect(
      await lintFixture('valid-external-sources/dist/greeter.js.map'),
    ).toMatchSnapshot();
  });

  test('path which does not exist', async () => {
    expect(await lintFixture('does-not-exist')).toMatchSnapshot();
  });
});
