import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { lint } from './index.js';
import type { LintOptions, LintResult } from './index.js';

const fixturesDir = path.relative(
  process.cwd(),
  path.join(import.meta.dirname, '..', 'test', 'fixtures'),
);

/**
 * Lints a fixture, sorting the result so it can be snapshotted regardless of
 * the order in which the source maps happened to be validated.
 */
async function lintFixture(
  name: string,
  options?: LintOptions,
): Promise<LintResult> {
  const result = await lint(path.join(fixturesDir, name), options);

  return {
    sourceMaps: [...result.sourceMaps].sort(),
    messages: [...result.messages].sort((a, b) =>
      `${a.filePath}${a.message}`.localeCompare(`${b.filePath}${b.message}`),
    ),
  };
}

function lintProjectFixture(name: string): Promise<LintResult> {
  return lintFixture(name, { cwd: path.join(fixturesDir, name) });
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

  test('map with mappings which are not base64 VLQ', async () => {
    expect(await lintFixture('invalid-mappings')).toMatchSnapshot();
  });

  test('map with mappings referencing sources and names which do not exist', async () => {
    expect(await lintFixture('out-of-range-mappings')).toMatchSnapshot();
  });

  test('map with an invalid ignore list', async () => {
    expect(await lintFixture('invalid-ignore-list')).toMatchSnapshot();
  });

  test('map which is not valid JSON', async () => {
    expect(await lintFixture('malformed-json')).toMatchSnapshot();
  });

  test('single source map file', async () => {
    expect(
      await lintFixture('valid-external-sources/dist/greeter.js.map'),
    ).toMatchSnapshot();
  });

  test('directory containing no source maps', async () => {
    expect(await lintFixture('no-source-maps')).toMatchSnapshot();
  });

  test('path which does not exist', async () => {
    expect(await lintFixture('does-not-exist')).toMatchSnapshot();
  });

  test('project with no build config', async () => {
    expect(await lintProjectFixture('valid-inline-sources')).toMatchSnapshot();
  });

  test('project with source maps but no minification', async () => {
    expect(
      await lintProjectFixture('tsdown-unnecessary-source-maps'),
    ).toMatchSnapshot();
  });

  test('project with source maps and minification', async () => {
    expect(await lintProjectFixture('tsdown-minified')).toMatchSnapshot();
  });

  test('project with source maps disabled', async () => {
    expect(
      await lintProjectFixture('tsdown-source-maps-disabled'),
    ).toMatchSnapshot();
  });

  test('project with source maps enabled in tsconfig', async () => {
    expect(await lintProjectFixture('tsconfig-source-maps')).toMatchSnapshot();
  });

  test('project with inline source maps enabled in tsconfig', async () => {
    expect(
      await lintProjectFixture('tsconfig-inline-source-maps'),
    ).toMatchSnapshot();
  });

  test('project with source maps disabled in tsconfig', async () => {
    expect(
      await lintProjectFixture('tsconfig-source-maps-disabled'),
    ).toMatchSnapshot();
  });
});
