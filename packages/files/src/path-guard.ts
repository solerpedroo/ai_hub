export function isPathInsideRoot(rootReal: string, candidateReal: string, sep: string): boolean {
  if (candidateReal === rootReal) {
    return true;
  }
  const prefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
  return candidateReal.startsWith(prefix);
}
