import { type FormEvent, type JSX, type KeyboardEvent, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function ChatComposer({
  value,
  onChange,
  onSend,
  onAbort,
  streaming,
  sending,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  streaming: boolean;
  sending: boolean;
  disabled: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const busy = streaming || sending;

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  const submit = (): void => {
    if (busy || disabled || value.trim().length === 0) {
      return;
    }
    onSend();
  };

  return (
    <form
      className="flex flex-col gap-1.5 border-t p-2"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="chat-composer">
        {t("workspace.composer.placeholder")}
      </label>
      <textarea
        ref={areaRef}
        id="chat-composer"
        data-testid="chat-composer"
        aria-busy={busy}
        value={value}
        disabled={disabled || sending}
        rows={3}
        className="min-h-[4.5rem] w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={t("workspace.composer.placeholder")}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Escape" && streaming) {
            event.preventDefault();
            onAbort();
            return;
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">{t("workspace.composer.hint")}</p>
        {streaming ? (
          <Button
            type="button"
            variant="outline"
            data-testid="chat-stop"
            onClick={() => {
              onAbort();
            }}
          >
            {t("workspace.composer.stop")}
          </Button>
        ) : (
          <Button type="submit" data-testid="chat-send" disabled={disabled || sending || value.trim().length === 0}>
            {t("workspace.composer.send")}
          </Button>
        )}
      </div>
    </form>
  );
}
