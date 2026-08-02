import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const links = [
  ["/", "Ana Sayfa"],
  ["/blog", "Blog"],
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-amber-300/15 bg-[#0b0b0c]/95 text-white shadow-[0_10px_35px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />

      <div className="mx-auto flex min-h-[68px] max-w-[1120px] items-center justify-between gap-5 px-4 sm:px-6">
        <Link href="/" className="group shrink-0" aria-label={`${siteConfig.name} ana sayfa`}>
          <span className="miss-brand-gold block text-[17px] font-black tracking-[-0.035em] sm:text-[20px]">
            {siteConfig.name}
          </span>
          <span className="mt-0.5 hidden text-[8px] font-bold uppercase tracking-[0.28em] text-amber-100/45 sm:block">
            Premium Blog
          </span>
        </Link>

        <nav className="hidden items-center rounded-full border border-white/[0.08] bg-white/[0.035] p-1 text-[13px] font-semibold text-neutral-300 shadow-inner md:flex" aria-label="Ana menü">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-4 py-2 transition duration-200 hover:bg-white/[0.08] hover:text-amber-100"
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/reklam-ver"
          className="group relative inline-flex items-center overflow-hidden rounded-full border border-amber-300/45 bg-gradient-to-b from-amber-200 to-amber-400 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.06em] text-[#211500] shadow-[0_0_18px_rgba(251,191,36,0.16)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_26px_rgba(251,191,36,0.28)] sm:px-5"
        >
          <span className="relative z-10">Reklam ver</span>
          <span className="absolute inset-y-0 -left-10 w-8 rotate-12 bg-white/45 blur-md transition-all duration-500 group-hover:left-[120%]" />
        </Link>
      </div>

      <nav className="border-t border-white/[0.06] bg-black/25 px-3 py-2 md:hidden" aria-label="Mobil menü">
        <div className="mx-auto flex max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold text-neutral-300 transition hover:bg-white/[0.08] hover:text-amber-100"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
