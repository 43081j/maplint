# maplint 🛠️

> A tiny linter for validating source maps.

This package checks your source maps for common mistakes and ensures
that they are valid according to the source map v3 spec.

## Usage

Validate every source map in a directory:

```sh
npx maplint ./dist
```

Or a single source map file:

```sh
npx maplint ./dist/index.js.map
```

You can also validate the source maps published in an npm package:

```sh
npx maplint --npm some-package
npx maplint --npm some-package@3
```

## Programmatic usage

Run selected validators on an already parsed, schema-valid source map:

```ts
import {
  ignoreListValidator,
  mappingsValidator,
  SEVERITY_ERROR,
} from 'maplint';
import type { SourceMapFile } from 'maplint';

const file: SourceMapFile = {
  path: 'dist/app.js.map',
  map: { version: 3, sources: ['app.ts'], mappings: 'AAAA', ignoreList: [0] },
};
const messages = [
  ...(await mappingsValidator(file)),
  ...(await ignoreListValidator(file)),
];
const errors = messages.filter(
  (message) => message.severity === SEVERITY_ERROR,
);
```

Validators expect schema-valid input; they do not perform schema validation.
`mappingsValidator` and `ignoreListValidator` operate entirely in memory.
`sourceFilesValidator` checks the filesystem for local sources missing inline
`sourcesContent`, resolving relative paths from the map's directory and
`sourceRoot`.

## Options

| Option         | Description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `--npm`        | Treat the path as an npm package spec (e.g. `foo` or `foo@3`) and validate the source maps in its tarball |
| `--quiet`      | Only report errors, skipping any warnings                                                                 |
| `-h`, `--help` | Display usage information                                                                                 |

## License

MIT
