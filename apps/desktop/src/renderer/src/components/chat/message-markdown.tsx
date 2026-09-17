import { type JSX, type MouseEvent, useState } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className"]],
    pre: [...(defaultSchema.attributes?.pre ?? []), ["className"]],
  },
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({
  text,
  label,
  copiedLabel,
  className,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-6 px-1.5 text-[11px]", className)}
      onClick={() => {
        void copyText(text).then((ok) => {
          if (!ok) {
            return;
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

function PreBlock({
  children,
  className,
  ...props
}: JSX.IntrinsicElements["pre"]): JSX.Element {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <pre
      {...props}
      className={cn(
        "relative overflow-x-auto rounded-md bg-zinc-900 p-3 pr-16 text-zinc-100",
        className,
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="absolute right-1 top-1 h-6 px-1.5 text-[11px] border-zinc-600 bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          const code = event.currentTarget.parentElement?.querySelector("code");
          const text = code?.textContent ?? "";
          void copyText(text).then((ok) => {
            if (!ok) {
              return;
            }
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          });
        }}
      >
        {copied ? t("workspace.copied") : t("workspace.copyCode")}
      </Button>
      {children}
    </pre>
  );
}

const markdownComponents: Components = {
  pre: PreBlock,
  a: ({ href, children }) => (
    <span className="underline decoration-dotted" title={href}>
      {children}
    </span>
  ),
};

export function MessageMarkdown({ content }: { content: string }): JSX.Element {
  return (
    <div className="chat-md max-w-none text-[13px] leading-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre_code]:bg-transparent [&_pre_code]:p-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, markdownSchema], rehypeHighlight]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function CopyResponseButton({ text }: { text: string }): JSX.Element {
  const { t } = useTranslation();
  return (
    <CopyButton text={text} label={t("workspace.copy")} copiedLabel={t("workspace.copied")} />
  );
}
