export function stripAttachedFileBodiesForRenderer(system: string): string {
  const omitted = system.replace(
    /((?:Attached file|Mentioned conversation|Mentioned packet): [^\n]+)(?:\n(?!(?:Attached file|Mentioned conversation|Mentioned packet):)[\s\S]*?)?(?=(?:\n\n(?:Attached file|Mentioned conversation|Mentioned packet): )|$)/g,
    "$1\n[extract omitted from renderer]",
  );
  return omitted;
}
