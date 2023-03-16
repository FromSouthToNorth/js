/**
 * Returns an Array with all the duplicates removed
 * var a = [1,1,2,3,3];
 * utilArrayUniq(a)
 *   [1,2,3]
 */
export function utilArrayUniq(a) {
  return Array.from(new Set(a));
}
