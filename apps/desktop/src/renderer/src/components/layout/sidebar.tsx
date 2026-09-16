import { type JSX, type ReactNode } from "react";
import { Home, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AppView } from "./types";

export function Sidebar({
  view,
  onChange,
}: {
  view: AppView;
  onChange: (view: AppView) => void;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <ScrollArea className="flex-1 p-2">
        <nav className="flex flex-col gap-0.5">
          <NavButton
            active={view === "home"}
            icon={<Home className="h-3.5 w-3.5" />}
            label={t("nav.home")}
            onClick={() => onChange("home")}
          />
          <NavButton
            active={view === "settings"}
            icon={<Settings className="h-3.5 w-3.5" />}
            label={t("nav.settings")}
            onClick={() => onChange("settings")}
          />
        </nav>
      </ScrollArea>
    </aside>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}): JSX.Element {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      className="h-8 w-full justify-start gap-2"
      onClick={onClick}
    >
      {icon}
      {label}
    </Button>
  );
}
