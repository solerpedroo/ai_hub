export function stripAttachedFileBodiesForRenderer(system: string): string {
  const heading =
    "(?:Attached file|Mentioned conversation|Mentioned packet|Project memory|Retrieved chunk|Library prompt)";
  const omitted = system.replace(
    new RegExp(
      `((?:${heading}): [^\\n]+)(?:\\n(?!${heading}:)[\\s\\S]*?)?(?=(?:\\n\\n(?:${heading}): )|$)`,
      "g",
    ),
    "$1\n[extract omitted from renderer]",
  );
  return omitted;
}
