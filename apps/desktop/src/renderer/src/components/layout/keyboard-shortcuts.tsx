import { type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const modifier = window.hub.platform === "darwin" ? "⌘" : "Ctrl";
  const rows = [
    [`${modifier}+K`, t("shortcuts.palette")],
    [`${modifier}+N`, t("shortcuts.newChat")],
    [`${modifier}+Shift+N`, t("shortcuts.newProject")],
    [`${modifier}+/`, t("shortcuts.cheatsheet")],
    [`${modifier}+Shift+S`, t("shortcuts.skills")],
    ["Enter", t("shortcuts.send")],
    ["Shift+Enter", t("shortcuts.newline")],
    ["Esc", t("shortcuts.stop")],
  ] as const;
  const slashCommands = ["model", "clear", "compact", "packet", "cap", "skill"] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="shortcuts-dialog">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
          {rows.map(([keys, label]) => (
            <div key={keys} className="contents">
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                {keys}
              </kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <section className="border-t pt-3">
          <h3 className="mb-2 text-[12px] font-medium">{t("shortcuts.slashTitle")}</h3>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            {slashCommands.map((command) => (
              <div key={command} className="contents">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                  /{command}
                </kbd>
                <span>{t(`slash.${command}.description`)}</span>
              </div>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
