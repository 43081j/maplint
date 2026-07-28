import * as v from 'valibot';

/**
 * A source map, as described by the source map v3 specification.
 */
export const SourceMapSchema = v.object({
  version: v.literal(3),
  file: v.optional(v.string()),
  sourceRoot: v.optional(v.string()),
  sources: v.array(v.nullable(v.string())),
  sourcesContent: v.optional(v.array(v.nullable(v.string()))),
  names: v.optional(v.array(v.string())),
  mappings: v.string(),
  ignoreList: v.optional(v.array(v.number())),
});

export type SourceMap = v.InferOutput<typeof SourceMapSchema>;

/**
 * A parsed source map, alongside the path it was loaded from.
 */
export const SourceMapFileSchema = v.object({
  path: v.string(),
  map: SourceMapSchema,
});

export type SourceMapFile = v.InferOutput<typeof SourceMapFileSchema>;

/**
 * A problem discovered in a source map by a validator.
 */
export interface ValidationError {
  filePath?: string;
  message: string;
}

/**
 * Validates a single source map, returning any problems found with it.
 */
export type Validator = (file: SourceMapFile) => ValidationError[];

export const validators: Validator[] = [];
