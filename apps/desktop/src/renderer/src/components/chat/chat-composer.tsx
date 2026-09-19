import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { looksLikePastedSecret, redactPastedSecrets } from "@ai-hub/shared";
import { Button } from "@/components/ui/button";

export type SlashCommandId = "model" | "clear" | "compact" | "packet" | "cap";

const SLASH_COMMANDS: SlashCommandId[] = ["model", "clear", "compact", "packet", "cap"];

export function matchKnownSlashCommand(draft: string): SlashCommandId | null {
  const trimmed = draft.trim();
  if (!trimmed.startsWith("/") || /\s/.test(trimmed)) {
    return null;
  }
  const id = trimmed.slice(1).toLowerCase();
  return (SLASH_COMMANDS as readonly string[]).includes(id) ? (id as SlashCommandId) : null;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onAbort,
  onSlashCommand,
  onFilesDrop,
  streaming,
  sending,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  onSlashCommand: (command: SlashCommandId) => void;
  onFilesDrop: (files: File[]) => void;
  streaming: boolean;
  sending: boolean;
  disabled: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const busy = streaming || sending;
  const secretWarning = looksLikePastedSecret(value);
  const slashQuery =
    value.startsWith("/") && !/\s/.test(value) ? value.slice(1).toLowerCase() : null;
  const slashCommands = slashDismissed
    ? []
    : SLASH_COMMANDS.filter(
        (command) => slashQuery !== null && command.startsWith(slashQuery),
      );
  const slashOpen = slashCommands.length > 0 && !busy;

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedSlashIndex(0);
    setSlashDismissed(false);
  }, [value]);

  const submit = (): void => {
    if (busy || disabled || value.trim().length === 0) {
      return;
    }
    const command = matchKnownSlashCommand(value);
    if (command) {
      onChange("");
      onSlashCommand(command);
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
        aria-autocomplete="list"
        aria-controls={slashOpen ? "slash-command-list" : undefined}
        aria-expanded={slashOpen}
        aria-activedescendant={
          slashOpen
            ? `slash-command-${slashCommands[selectedSlashIndex] ?? slashCommands[0]}`
            : undefined
        }
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes("Files")) {
            event.preventDefault();
          }
        }}
        onDrop={(event) => {
          if (event.dataTransfer.files.length === 0) {
            return;
          }
          event.preventDefault();
          onFilesDrop([...event.dataTransfer.files]);
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Escape" && streaming) {
            event.preventDefault();
            onAbort();
            return;
          }
          if (slashOpen && event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedSlashIndex((current) => (current + 1) % slashCommands.length);
            return;
          }
          if (slashOpen && event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedSlashIndex(
              (current) => (current - 1 + slashCommands.length) % slashCommands.length,
            );
            return;
          }
          if (slashOpen && (event.key === "Enter" || event.key === "Tab")) {
            event.preventDefault();
            const command = slashCommands[selectedSlashIndex] ?? slashCommands[0];
            if (command) {
              onChange("");
              onSlashCommand(command);
            }
            return;
          }
          if (slashOpen && event.key === "Escape") {
            event.preventDefault();
            setSlashDismissed(true);
            return;
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      {slashOpen ? (
        <div
          id="slash-command-list"
          role="listbox"
          className="overflow-hidden rounded-md border bg-popover p-1 shadow-md"
          data-testid="slash-command-list"
        >
          {slashCommands.map((command, index) => (
            <button
              key={command}
              id={`slash-command-${command}`}
              type="button"
              role="option"
              aria-selected={index === selectedSlashIndex}
              className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent aria-selected:bg-accent"
              data-testid={`slash-command-${command}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange("");
                onSlashCommand(command);
              }}
            >
              <code className="font-mono">/{command}</code>
              <span className="text-muted-foreground">
                {t(`slash.${command}.description`)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        {secretWarning ? (
          <p
            className="text-[11px] text-destructive"
            role="status"
            data-testid="composer-secret-warning"
          >
            {t("workspace.composer.secretWarning")}{" "}
            <button
              type="button"
              className="underline"
              data-testid="composer-secret-redact"
              onClick={() => onChange(redactPastedSecrets(value))}
            >
              {t("workspace.composer.secretRedact")}
            </button>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t("workspace.composer.hint")}
          </p>
        )}
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
          <Button
            type="submit"
            data-testid="chat-send"
            disabled={disabled || sending || value.trim().length === 0}
          >
            {t("workspace.composer.send")}
          </Button>
        )}
      </div>
    </form>
  );
}
