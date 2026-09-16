import { type CSSProperties, type JSX, type ReactNode } from "react";
import { Minus, Square, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const dragStyle = { WebkitAppRegion: "drag" } as CSSProperties;
const noDragStyle = { WebkitAppRegion: "no-drag" } as CSSProperties;

export function TitleBar(): JSX.Element {
  const { t } = useTranslation();

  return (
    <header className="flex h-9 shrink-0 items-center border-b bg-background">
      <div className="flex flex-1 items-center px-3 text-[13px] font-medium" style={dragStyle}>
        {t("app.name")}
      </div>
      <div className="flex items-center" style={noDragStyle}>
        <WindowButton
          label={t("window.minimize")}
          onClick={() => void window.hub.window.minimize()}
        >
          <Minus className="h-3.5 w-3.5" />
        </WindowButton>
        <WindowButton
          label={t("window.maximize")}
          onClick={() => void window.hub.window.maximize()}
        >
          <Square className="h-3 w-3" />
        </WindowButton>
        <WindowButton
          label={t("window.close")}
          destructive
          onClick={() => void window.hub.window.close()}
        >
          <X className="h-3.5 w-3.5" />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  label,
  onClick,
  children,
  destructive = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  destructive?: boolean;
}): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={destructive ? "h-9 w-11 rounded-none hover:bg-destructive hover:text-destructive-foreground" : "h-9 w-11 rounded-none"}
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
