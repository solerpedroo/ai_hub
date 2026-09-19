export function stripAttachedFileBodiesForRenderer(system: string): string {
  return system.replace(
    /(Attached file: [^\n]+)(?:\n(?!Attached file:)[\s\S]*?)?(?=(?:\n\nAttached file: )|$)/g,
    "$1\n[file extract omitted from renderer]",
  );
}
