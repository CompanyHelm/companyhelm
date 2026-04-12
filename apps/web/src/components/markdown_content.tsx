import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  className?: string;
  content: string;
  emptyClassName?: string;
  emptyLabel?: string;
  tone?: "default" | "muted";
  variant?: "compact" | "default";
};

/**
 * Renders markdown with the shared CompanyHelm typography so transcript, details, and dialogs use
 * one consistent spacing and code-block treatment across the web application.
 */
export function MarkdownContent({
  className,
  content,
  emptyClassName,
  emptyLabel,
  tone = "default",
  variant = "default",
}: MarkdownContentProps) {
  if (content.trim().length === 0) {
    if (!emptyLabel) {
      return null;
    }

    return (
      <p
        className={cn(
          variant === "compact" ? "text-xs leading-5" : "text-sm",
          tone === "muted" ? "text-muted-foreground" : "text-foreground",
          emptyClassName,
        )}
      >
        {emptyLabel}
      </p>
    );
  }

  const isCompact = variant === "compact";
  const bodyTextClassName = tone === "muted" ? "text-muted-foreground" : "text-foreground";
  const codeSurfaceClassName = isCompact ? "bg-background/80 text-[11px]" : "bg-muted text-[13px]";
  const preSurfaceClassName = isCompact ? "bg-background/80 text-[11px]" : "bg-muted/30 text-[13px]";
  const tableTextClassName = isCompact ? "text-xs leading-5" : "text-sm leading-6";
  const tableCellClassName = isCompact ? "px-2 py-1.5" : "px-3 py-2";

  return (
    <div className={cn("min-w-0 w-full [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...anchorProps }) => (
            <a
              {...anchorProps}
              className="font-medium text-foreground underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                isCompact ? "mt-3 pl-3 text-xs leading-5" : "mt-4 pl-4 text-sm leading-6",
                "min-w-0 border-l-2 border-border/70 text-muted-foreground [overflow-wrap:anywhere]",
              )}
            >
              {children}
            </blockquote>
          ),
          code: ({ children, className: markdownClassName, ...codeProps }) => (
            <code
              {...codeProps}
              className={cn(
                markdownClassName,
                "max-w-full break-words rounded px-1 py-0.5 font-mono text-foreground [overflow-wrap:anywhere]",
                codeSurfaceClassName,
              )}
            >
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1
              className={cn(
                isCompact ? "mt-4 text-sm leading-6" : "mt-6 text-lg leading-7",
                "min-w-0 font-semibold text-foreground",
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                isCompact ? "mt-4 text-sm leading-6" : "mt-5 text-base leading-7",
                "min-w-0 font-semibold text-foreground",
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                isCompact ? "mt-3 text-xs leading-5" : "mt-4 text-sm leading-6",
                "min-w-0 font-semibold text-foreground",
              )}
            >
              {children}
            </h3>
          ),
          li: ({ children }) => (
            <li
              className={cn(
                isCompact ? "pl-1 text-xs leading-5" : "pl-1 leading-6",
                "min-w-0 marker:text-muted-foreground [&>p]:my-0 [&>ul]:mt-2 [&>ol]:mt-2",
                bodyTextClassName,
              )}
            >
              {children}
            </li>
          ),
          ol: ({ children }) => (
            <ol className={cn(isCompact ? "mt-3 gap-1" : "mt-4 gap-1.5", "ml-5 grid min-w-0 list-decimal")}>
              {children}
            </ol>
          ),
          p: ({ children }) => (
            <p
              className={cn(
                isCompact ? "mt-2 text-xs leading-5" : "mt-3 text-sm leading-6 text-pretty",
                "min-w-0 break-words [overflow-wrap:anywhere]",
                bodyTextClassName,
              )}
            >
              {children}
            </p>
          ),
          pre: ({ children }) => (
            <pre
              className={cn(
                isCompact ? "mt-3 px-3 py-2 leading-5" : "mt-4 px-4 py-3 leading-6",
                "w-full max-w-full overflow-x-auto overflow-y-hidden rounded-xl border border-border/60 font-mono text-foreground",
                preSurfaceClassName,
                "[&>code]:block [&>code]:w-max [&>code]:min-w-full [&>code]:bg-transparent [&>code]:p-0 [&>code]:whitespace-pre [&>code]:break-normal [&>code]:[overflow-wrap:normal]",
              )}
            >
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className={cn(isCompact ? "mt-3" : "mt-4", "w-full overflow-x-auto rounded-xl border border-border/60")}>
              <table className={cn("w-full min-w-max border-collapse bg-background/40 text-left", tableTextClassName)}>
                {children}
              </table>
            </div>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border/60">{children}</tbody>,
          td: ({ children }) => (
            <td className={cn(tableCellClassName, "align-top [overflow-wrap:anywhere] [&>p]:my-0", bodyTextClassName)}>
              {children}
            </td>
          ),
          th: ({ children }) => (
            <th
              className={cn(
                tableCellClassName,
                "border-b border-border/60 bg-muted/40 text-left font-semibold text-foreground [&>p]:my-0",
              )}
            >
              {children}
            </th>
          ),
          thead: ({ children }) => <thead>{children}</thead>,
          tr: ({ children }) => <tr className="align-top">{children}</tr>,
          ul: ({ children }) => (
            <ul className={cn(isCompact ? "mt-3 gap-1" : "mt-4 gap-1.5", "ml-5 grid min-w-0 list-disc")}>
              {children}
            </ul>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
