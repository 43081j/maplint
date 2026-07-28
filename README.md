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

## Options

| Option         | Description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `--npm`        | Treat the path as an npm package spec (e.g. `foo` or `foo@3`) and validate the source maps in its tarball |
| `-h`, `--help` | Display usage information                                                                                 |

## License

MIT
