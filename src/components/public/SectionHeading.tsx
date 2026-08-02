import Link from "next/link";
export function SectionHeading({ eyebrow, title, description, href, linkLabel = "Tümünü gör" }: { eyebrow?: string; title: string; description?: string; href?: string; linkLabel?: string }) {
  return <div className="mb-6 flex items-end justify-between gap-5"><div>{eyebrow ? <p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">{eyebrow}</p> : null}<h2 className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">{title}</h2>{description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p> : null}</div>{href ? <Link href={href} className="shrink-0 text-sm font-black underline underline-offset-4">{linkLabel}</Link> : null}</div>;
}
