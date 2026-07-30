import type { ProjectValidator, ValidationMessage } from './types.js';
import { unnecessarySourceMapsValidator } from './unnecessary-source-maps.js';

const validators: ProjectValidator[] = [unnecessarySourceMapsValidator];

/**
 * Validates the build configuration of the project in `cwd`.
 */
export async function validateProject(
  cwd: string,
): Promise<ValidationMessage[]> {
  const results = await Promise.all(
    validators.map((validator) => validator(cwd)),
  );

  return results.flat();
}
