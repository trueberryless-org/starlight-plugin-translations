export function formatCount(
  count: number,
  singular: string,
  plural: string
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Splits a translation key after each dot, e.g. to insert line break opportunities in long keys.
 */
export function splitKeyAtDots(key: string): string[] {
  return key.split(/(?<=\.)/);
}
