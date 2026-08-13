import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  body: string;
};

function renderInlineLinks(text: string): ReactNode[] {
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(text)) !== null) {
    const [fullMatch, label, href] = match;

    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const isInternalLink =
      href.startsWith("/") ||
      href.startsWith("https://www.missistanbull.com") ||
      href.startsWith("https://missistanbull.com");

    if (isInternalLink) {
      let internalHref = href;

      if (href.startsWith("https://www.missistanbull.com")) {
        internalHref =
          href.replace("https://www.missistanbull.com", "") || "/";
      }

      if (href.startsWith("https://missistanbull.com")) {
        internalHref =
          href.replace("https://missistanbull.com", "") || "/";
      }

      parts.push(
        <Link
          key={`${match.index}-${href}`}
          href={internalHref}
          className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-900 hover:decoration-sky-600"
        >
          {label}
        </Link>,
      );
    } else {
      parts.push(
        <a
          key={`${match.index}-${href}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-900 hover:decoration-sky-600"
        >
          {label}
        </a>,
      );
    }

    lastIndex = match.index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function ContentBody({ body }: Props) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-[17px] leading-8 text-neutral-700">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="pt-5 text-2xl font-black tracking-[-.035em] text-neutral-950"
            >
              {renderInlineLinks(block.slice(3))}
            </h2>
          );
        }

        if (block.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="pt-3 text-xl font-black text-neutral-950"
            >
              {renderInlineLinks(block.slice(4))}
            </h3>
          );
        }

        return <p key={index}>{renderInlineLinks(block)}</p>;
      })}
    </div>
  );
}