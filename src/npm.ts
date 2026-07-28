import { execFile } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import * as path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';
import { createGunzip } from 'node:zlib';
import { unpackTar } from 'modern-tar/fs';

const execFileAsync = promisify(execFile);

const isWindows = process.platform === 'win32';
const specPattern = /^[a-zA-Z0-9@/._~^><=+*-]+$/;

interface PackResult {
  id: string;
  filename: string;
}

function parsePackOutput(stdout: string): PackResult {
  const parsed: unknown = JSON.parse(stdout);
  // npm <=10 is an array, otherwise its an object
  const results = Array.isArray(parsed)
    ? parsed
    : Object.values(parsed as object);
  const result = results[0] as Partial<PackResult> | undefined;

  if (result?.filename === undefined || result.id === undefined) {
    throw new Error('"npm pack" did not report a tarball to download');
  }

  return { filename: result.filename, id: result.id };
}

/**
 * Downloads a package from the npm registry and extracts its contents into
 * `dest`, returning the resolved `name@version` of the package.
 */
export async function downloadPackage(
  spec: string,
  dest: string,
): Promise<string> {
  if (!specPattern.test(spec)) {
    throw new Error(`"${spec}" is not a valid npm package spec`);
  }

  let stdout: string;

  try {
    ({ stdout } = await execFileAsync(
      isWindows ? 'npm.cmd' : 'npm',
      ['pack', spec, '--json', '--pack-destination', dest],
      { shell: isWindows },
    ));
  } catch (err) {
    const { stderr } = err as { stderr?: string };

    throw new Error(
      `Failed to download "${spec}" from npm:\n${(stderr ?? (err as Error).message).trim()}`,
      { cause: err },
    );
  }

  const { filename, id } = parsePackOutput(stdout);
  const tarball = path.join(dest, filename);

  await pipeline(
    createReadStream(tarball),
    createGunzip(),
    unpackTar(dest, { strip: 1 }),
  );

  await unlink(tarball);

  return id;
}
