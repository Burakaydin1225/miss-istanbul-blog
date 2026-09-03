import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  body: string;
};

function isInternalHref(href: string) {
  return (
    href.startsWith("/") ||
    href.startsWith("https://www.missistanbull.com") ||
    href.startsWith("https://missistanbull.com")
  );
}

function normalizeInternalHref(href: string) {
  if (href.startsWith("https://www.missistanbull.com")) {
    return href.replace("https://www.missistanbull.com", "") || "/";
  }

  if (href.startsWith("https://missistanbull.com")) {
    return href.replace("https://missistanbull.com", "") || "/";
  }

  return href;
}

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

    if (label.startsWith("cta:")) {
      parts.push(fullMatch);
      lastIndex = match.index + fullMatch.length;
      continue;
    }

    if (isInternalHref(href)) {
      parts.push(
        <Link
          key={`${match.index}-${href}`}
          href={normalizeInternalHref(href)}
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
          rel="nofollow"
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

function renderCta(block: string, index: number): ReactNode | null {
  const match = block.match(/^\[cta:([^\]]+)\]\(([^)]+)\)$/);

  if (!match) {
    return null;
  }

  const [, label, href] = match;

  const className =
    "inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 active:scale-[0.99]";

  if (isInternalHref(href)) {
    return (
      <div key={index} className="py-2">
        <Link href={normalizeInternalHref(href)} className={className}>
          {label}
        </Link>
      </div>
    );
  }

  return (
    <div key={index} className="py-2">
      <a href={href} rel="nofollow" className={className}>
        {label}
      </a>
    </div>
  );
}

export function ContentBody({ body }: Props) {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5 text-[17px] leading-8 text-neutral-700">
      {blocks.map((block, index) => {
        const cta = renderCta(block, index);

        if (cta) {
          return cta;
        }

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
