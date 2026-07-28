import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { packTar } from 'modern-tar/fs';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const execFileAsync = promisify(execFile);

const rootDir = path.join(import.meta.dirname, '..');
const cliPath = path.join(rootDir, 'lib', 'cli.mjs');
const fixturesDir = path.join(rootDir, 'test', 'fixtures');

/**
 * Fixtures to publish to the mock registry, keyed by package name, mapping
 * each version to the fixture directory published as it.
 */
const packages: Record<string, Record<string, string>> = {
  'broken-pkg': { '1.0.0': 'unresolved-source' },
  'valid-pkg': {
    '1.0.0': 'valid-inline-sources',
    '2.0.0': 'valid-external-sources',
  },
};

const tarballs = new Map<string, Buffer>();

const tarballPath = (name: string, version: string): string =>
  `/${name}/-/${name}-${version}.tgz`;

async function packFixture(
  name: string,
  version: string,
  fixture: string,
): Promise<Buffer> {
  const chunks: Buffer[] = [];

  const stream = packTar([
    {
      content: JSON.stringify({ name, version }),
      target: 'package/package.json',
      type: 'content',
    },
    {
      source: path.join(fixturesDir, fixture),
      target: 'package',
      type: 'directory',
    },
  ]);

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  return gzipSync(Buffer.concat(chunks));
}

function createPackument(name: string, host: string): string {
  const versions = Object.keys(packages[name] as Record<string, string>);

  return JSON.stringify({
    'dist-tags': { latest: versions[versions.length - 1] },
    name,
    versions: Object.fromEntries(
      versions.map((version) => {
        const url = tarballPath(name, version);
        const contents = tarballs.get(url) as Buffer;

        return [
          version,
          {
            dist: {
              integrity: `sha512-${createHash('sha512').update(contents).digest('base64')}`,
              shasum: createHash('sha1').update(contents).digest('hex'),
              tarball: `http://${host}${url}`,
            },
            name,
            version,
          },
        ];
      }),
    ),
  });
}

/**
 * A really terribly designed npm registry.
 */
function createRegistry(): Server {
  return createServer((req, res) => {
    const url = decodeURIComponent(req.url ?? '');
    const tarball = tarballs.get(url);

    if (tarball !== undefined) {
      res.writeHead(200, { 'content-type': 'application/octet-stream' });
      res.end(tarball);
      return;
    }

    const name = url.slice(1);

    if (packages[name] === undefined) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(createPackument(name, req.headers.host ?? ''));
  });
}

interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

let server: Server;
let registryUrl: string;
let npmCache: string;

async function runCLI(...args: string[]): Promise<CLIResult> {
  const options = {
    cwd: rootDir,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_cache: npmCache,
      npm_config_fund: 'false',
      npm_config_registry: registryUrl,
    },
  };

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [cliPath, ...args],
      options,
    );

    return { exitCode: 0, stderr, stdout };
  } catch (err) {
    const { code, stderr, stdout } = err as {
      code: number;
      stdout: string;
      stderr: string;
    };

    return { exitCode: code, stderr, stdout };
  }
}

describe('cli', () => {
  beforeAll(async () => {
    await Promise.all(
      Object.entries(packages).flatMap(([name, versions]) =>
        Object.entries(versions).map(async ([version, fixture]) => {
          tarballs.set(
            tarballPath(name, version),
            await packFixture(name, version, fixture),
          );
        }),
      ),
    );

    npmCache = await mkdtemp(path.join(tmpdir(), 'maplint-test-'));

    await new Promise<void>((resolve) => {
      server = createRegistry().listen(0, '127.0.0.1', resolve);
    });

    const { port } = server.address() as { port: number };

    registryUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    server.close();
    await rm(npmCache, { force: true, recursive: true });
  });

  test('--help', async () => {
    expect(await runCLI('--help')).toMatchSnapshot();
  });

  test('no arguments', async () => {
    expect(await runCLI()).toMatchSnapshot();
  });

  test('a path to lint', async () => {
    expect(await runCLI('test/fixtures/invalid-shape')).toMatchSnapshot();
  });

  test('--npm with a package', async () => {
    expect(await runCLI('--npm', 'valid-pkg')).toMatchSnapshot();
  });

  test('--npm with a package version', async () => {
    expect(await runCLI('--npm', 'valid-pkg@1')).toMatchSnapshot();
  });

  test('--npm with a package containing an invalid source map', async () => {
    expect(await runCLI('--npm', 'broken-pkg')).toMatchSnapshot();
  });

  test('--npm with an invalid package spec', async () => {
    expect(await runCLI('--npm', 'foo; bar')).toMatchSnapshot();
  });

  test('--npm with a package which does not exist', async () => {
    const result = await runCLI('--npm', 'no-such-pkg');

    // Only the first line is asserted, as the rest is npm's own output and
    // varies between npm versions.
    expect(result.exitCode).toBe(1);
    expect(result.stderr.split('\n')[0]).toMatchSnapshot();
  });
});
