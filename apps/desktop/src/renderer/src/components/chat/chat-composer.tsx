import {
  type FormEvent,
  type JSX,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Paperclip, SendHorizontal, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  looksLikePastedSecret,
  mentionTriggerIn,
  parseSkillSlashDraft,
  redactPastedSecrets,
  type MentionType,
} from "@ai-hub/shared";
import { Button } from "@/components/ui/button";

export type SlashCommandId = "model" | "clear" | "compact" | "packet" | "cap" | "skill";

export interface MentionSuggestion {
  type: MentionType;
  id: string | null;
  query: string;
  label: string;
  excerpt: string;
  tokens: number;
  available: boolean;
}

const SLASH_COMMANDS: SlashCommandId[] = ["model", "clear", "compact", "packet", "cap", "skill"];

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
  onSkillSlash,
  onFilesDrop,
  mentionSuggestions,
  onMentionQuery,
  onPickMention,
  onRemoveLastMention,
  hasMentions,
  streaming,
  sending,
  disabled,
  onAttachFile,
  onAttachFolder,
  extraSystem,
  onExtraSystemChange,
  voicePanel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onAbort: () => void;
  onSlashCommand: (command: SlashCommandId) => void;
  onSkillSlash: (query: string | null, remainder: string) => void;
  onFilesDrop: (files: File[]) => void;
  mentionSuggestions: MentionSuggestion[];
  onMentionQuery: (typed: string | null) => void;
  onPickMention: (item: MentionSuggestion, replace: { start: number; end: number }) => void;
  onRemoveLastMention: () => void;
  hasMentions: boolean;
  streaming: boolean;
  sending: boolean;
  disabled: boolean;
  onAttachFile: () => void;
  onAttachFolder: () => void;
  extraSystem: string;
  onExtraSystemChange: (value: string) => void;
  voicePanel: (open: boolean, onOpenChange: (open: boolean) => void) => JSX.Element | null;
}): JSX.Element {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const [slashDismissed, setSlashDismissed] = useState(false);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [caret, setCaret] = useState(0);
  const [activePopover, setActivePopover] = useState<"attachments" | "instructions" | "voice" | null>(null);
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
  const trigger = mentionTriggerIn(value, caret);
  const mentionOpen =
    !slashOpen && !mentionDismissed && !busy && trigger !== null && mentionSuggestions.length > 0;
  const canSubmit = value.trim().length > 0 || hasMentions;

  useEffect(() => {
    areaRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedSlashIndex(0);
    setSlashDismissed(false);
    setSelectedMentionIndex(0);
    setMentionDismissed(false);
  }, [value]);

  const onMentionQueryRef = useRef(onMentionQuery);
  onMentionQueryRef.current = onMentionQuery;
  useEffect(() => {
    onMentionQueryRef.current(trigger?.typed ?? null);
  }, [trigger?.typed]);

  const syncCaret = (): void => {
    const node = areaRef.current;
    if (node) {
      setCaret(node.selectionStart);
    }
  };

  const submit = (): void => {
    if (busy || disabled || !canSubmit) {
      return;
    }
    const command = matchKnownSlashCommand(value);
    if (command) {
      onChange("");
      onSlashCommand(command);
      return;
    }
    const skillSlash = parseSkillSlashDraft(value);
    if (skillSlash) {
      onChange(skillSlash.remainder);
      onSkillSlash(skillSlash.query, skillSlash.remainder);
      return;
    }
    onSend();
  };

  return (
    <form
      className="mx-3 mb-3 flex flex-col gap-2 rounded-xl border bg-card p-2.5 shadow-[0_8px_24px_hsl(224_30%_15%_/_0.06)]"
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
        className="min-h-[5rem] w-full resize-none rounded-lg border border-input bg-background/60 px-3 py-2.5 text-[13px] shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        placeholder={t("workspace.composer.placeholder")}
        aria-autocomplete="list"
        aria-controls={
          slashOpen ? "slash-command-list" : mentionOpen ? "mention-list" : undefined
        }
        aria-expanded={slashOpen || mentionOpen}
        aria-activedescendant={
          slashOpen
            ? `slash-command-${slashCommands[selectedSlashIndex] ?? slashCommands[0]}`
            : mentionOpen
              ? `mention-option-${selectedMentionIndex}`
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
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart);
        }}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
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
          if (mentionOpen && event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedMentionIndex((current) => (current + 1) % mentionSuggestions.length);
            return;
          }
          if (mentionOpen && event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedMentionIndex(
              (current) => (current - 1 + mentionSuggestions.length) % mentionSuggestions.length,
            );
            return;
          }
          if (mentionOpen && event.key === "Enter" && parseSkillSlashDraft(value)?.query) {
            event.preventDefault();
            submit();
            return;
          }
          if (mentionOpen && (event.key === "Enter" || event.key === "Tab") && trigger) {
            event.preventDefault();
            const item = mentionSuggestions[selectedMentionIndex] ?? mentionSuggestions[0];
            if (item) {
              onPickMention(item, { start: trigger.start, end: caret });
            }
            return;
          }
          if (mentionOpen && event.key === "Escape") {
            event.preventDefault();
            setMentionDismissed(true);
            return;
          }
          if (event.key === "Backspace" && caret === 0 && value.length === 0 && hasMentions) {
            event.preventDefault();
            onRemoveLastMention();
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
      {mentionOpen ? (
        <div
          id="mention-list"
          role="listbox"
          className="overflow-hidden rounded-md border bg-popover p-1 shadow-md"
          data-testid="mention-list"
        >
          {mentionSuggestions.map((item, index) => (
            <button
              key={`${item.type}-${item.id ?? item.query}-${index}`}
              id={`mention-option-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedMentionIndex}
              className="flex w-full flex-col gap-0.5 rounded-sm px-2 py-1.5 text-left text-[12px] hover:bg-accent aria-selected:bg-accent"
              data-testid={`mention-option-${item.type}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (trigger) {
                  onPickMention(item, { start: trigger.start, end: caret });
                }
              }}
            >
              <span className="font-mono">
                @{item.type}
                {item.query ? `:${item.query}` : ""}
              </span>
              <span className="text-muted-foreground">
                {item.available ? item.label : t("mentions.stub")}
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
        <div className="relative flex items-center gap-1">
        <div className="relative">
          <Button type="button" size="icon" variant={activePopover === "instructions" ? "secondary" : "ghost"} aria-label={t("workspace.extraSystem")} aria-pressed={activePopover === "instructions"} onClick={() => setActivePopover((value) => value === "instructions" ? null : "instructions")}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          {activePopover === "instructions" ? (
            <div className="surface-raised absolute bottom-10 right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl p-3 shadow-xl">
              <label htmlFor="extra-system-instructions" className="mb-2 block text-xs font-medium">{t("workspace.extraSystem")}</label>
              <textarea id="extra-system-instructions" rows={4} value={extraSystem} onChange={(event) => onExtraSystemChange(event.target.value)} className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
          ) : null}
        </div>
        {voicePanel(activePopover === "voice", (open) => setActivePopover(open ? "voice" : null))}
        {!streaming ? (
          <div className="relative">
            <Button type="button" size="icon" variant={activePopover === "attachments" ? "secondary" : "ghost"} disabled={disabled || sending} aria-label={t("files.attach")} onClick={() => setActivePopover((open) => open === "attachments" ? null : "attachments")}>
              <Paperclip className="h-4 w-4" />
            </Button>
            {activePopover === "attachments" ? (
              <div className="surface-raised absolute bottom-10 right-0 z-40 w-40 rounded-lg p-1 shadow-xl">
                <button type="button" className="w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent" onClick={() => { setActivePopover(null); onAttachFile(); }}>{t("files.attach")}</button>
                <button type="button" className="w-full rounded px-2 py-1.5 text-left text-[12px] hover:bg-accent" onClick={() => { setActivePopover(null); onAttachFolder(); }}>{t("files.attachFolder")}</button>
              </div>
            ) : null}
          </div>
        ) : null}
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
            size="icon"
            data-testid="chat-send"
            disabled={disabled || sending || !canSubmit}
            aria-label={t("workspace.composer.send")}
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        )}
        </div>
      </div>
    </form>
  );
}
