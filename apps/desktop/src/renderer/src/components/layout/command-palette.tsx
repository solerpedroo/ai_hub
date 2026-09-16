import { useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import type { ThemeMode } from "@ai-hub/shared";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/lib/theme";

export function ChromeCommandPalette(): JSX.Element {
  const { t } = useTranslation();
  const { setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const applyTheme = (mode: ThemeMode): void => {
    setTheme(mode);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{t("command.placeholder")}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder={t("command.placeholder")} />
          <CommandList>
            <CommandEmpty>{t("command.empty")}</CommandEmpty>
            <CommandItem onSelect={() => applyTheme("light")}>{t("command.theme")}: {t("theme.light")}</CommandItem>
            <CommandItem onSelect={() => applyTheme("dark")}>
              {t("command.theme")}: {t("theme.dark")}
            </CommandItem>
            <CommandItem onSelect={() => applyTheme("system")}>
              {t("command.theme")}: {t("theme.system")}
            </CommandItem>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
