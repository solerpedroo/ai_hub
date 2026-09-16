import { type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function HomeView({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-start gap-3">
        <h1 className="text-base font-semibold">{t("empty.title")}</h1>
        <p className="text-muted-foreground">{t("empty.body")}</p>
        <Button type="button" onClick={onOpenSettings}>
          {t("empty.action")}
        </Button>
      </div>
    </div>
  );
}
