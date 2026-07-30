import * as v from 'valibot';

/**
 * A source map, as described by the source map v3 specification.
 */
export const SourceMapSchema = v.object(
  {
    version: v.literal(3, 'Source map version must be 3'),
    file: v.optional(v.string('"file" must be the path of the generated file')),
    sourceRoot: v.optional(
      v.string('"sourceRoot" must be a path prepended to each source'),
    ),
    sources: v.array(
      v.nullable(v.string('Each source must be a path or null')),
      '"sources" must be an array of source paths',
    ),
    sourcesContent: v.optional(
      v.array(
        v.nullable(v.string('Each source content must be a string or null')),
        '"sourcesContent" must be an array of source contents',
      ),
    ),
    names: v.optional(
      v.array(
        v.string('Each name must be a string'),
        '"names" must be an array of names',
      ),
    ),
    mappings: v.string(
      '"mappings" must be a VLQ (variable length quantity) encoded string of mappings',
    ),
    ignoreList: v.optional(
      v.array(
        v.number('Each ignored source must be an index into "sources"'),
        '"ignoreList" must be an array of source indices',
      ),
    ),
  },
  'Source map must be an object',
);

export type SourceMap = v.InferOutput<typeof SourceMapSchema>;

/**
 * A parsed source map, alongside the path it was loaded from.
 */
export const SourceMapFileSchema = v.object({
  path: v.string(),
  map: SourceMapSchema,
});

export type SourceMapFile = v.InferOutput<typeof SourceMapFileSchema>;

export const SEVERITY_WARN = 1;
export const SEVERITY_ERROR = 2;

export type Severity = typeof SEVERITY_WARN | typeof SEVERITY_ERROR;

/**
 * A problem discovered in a source map by a validator.
 */
export interface ValidationMessage {
  filePath?: string;
  message: string;
  severity: Severity;
}

/**
 * Validates a single source map, returning any problems found with it.
 */
export type Validator = (
  file: SourceMapFile,
) => ValidationMessage[] | Promise<ValidationMessage[]>;

/**
 * Validates the project which produced the source maps, rather than any
 * individual source map.
 */
export type ProjectValidator = (
  cwd: string,
) => ValidationMessage[] | Promise<ValidationMessage[]>;
