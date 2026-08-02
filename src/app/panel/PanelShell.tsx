"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { logoutAction } from "@/app/panel/actions";

type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

type IconName =
  | "dashboard"
  | "listing"
  | "content"
  | "analytics"
  | "pricing"
  | "seo"
  | "district"
  | "category"
  | "placement"
  | "settings"
  | "users"
  | "logs"
  | "account"
  | "external"
  | "menu"
  | "close"
  | "logout"
  | "search";

type PanelShellProps = {
  children: ReactNode;
  userName: string;
  roleLabel: string;
  roleClassName: string;
  groups: NavigationGroup[];
};

function Icon({ name, className = "size-[18px]" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    listing: <><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9h8M8 13h8M8 17h5"/></>,
    content: <><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h5M9 12h7M9 16h7"/></>,
    analytics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
    pricing: <><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.6-1.7-1-3-1-1.7 0-3 .9-3 2.2 0 3.3 6 1.7 6 5 0 1.3-1.3 2.3-3 2.3-1.4 0-2.6-.5-3.5-1.3M12 5.5v13"/></>,
    seo: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/></>,
    district: <><path d="M12 22s7-6.2 7-13a7 7 0 0 0-14 0c0 6.8 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></>,
    category: <><path d="m4 4 6 0 0 6-6 0zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></>,
    placement: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
    logs: <><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    account: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
    external: <><path d="M14 3h7v7M10 14 21 3M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[name]}</svg>;
}

export default function PanelShell({ children, userName, roleLabel, roleClassName, groups }: PanelShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => href === "/panel" ? pathname === href : pathname.startsWith(href);
  const initials = userName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "MI";

  const sidebar = (
    <aside className="flex h-full w-[276px] flex-col bg-[#111216] text-white">
      <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-5">
        <Link href="/panel" onClick={() => setMobileOpen(false)} className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-fuchsia-500 to-violet-600 text-sm font-black shadow-lg shadow-fuchsia-950/30">MI</span>
          <span className="min-w-0"><span className="block truncate text-sm font-extrabold tracking-tight">Miss İstanbul</span><span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Control Center</span></span>
        </Link>
        <button type="button" onClick={() => setMobileOpen(false)} className="rounded-xl p-2 text-white/50 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Menüyü kapat"><Icon name="close"/></button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#333_transparent]">
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/25">{group.label}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`group flex min-h-11 items-center gap-3 rounded-[14px] px-3 text-[13px] font-semibold transition ${active ? "bg-white text-neutral-950 shadow-sm" : "text-white/58 hover:bg-white/[0.07] hover:text-white"}`}>
                    <span className={active ? "text-fuchsia-600" : "text-white/38 group-hover:text-white/80"}><Icon name={item.icon}/></span>
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${active ? "bg-fuchsia-100 text-fuchsia-700" : "bg-white/10 text-white/60"}`}>{item.badge}</span> : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/[0.07] p-3">
        <Link href="/panel/hesabim" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-[16px] p-2.5 transition hover:bg-white/[0.07]">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xs font-black">{initials}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-white/90">{userName}</span><span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${roleClassName}`}>{roleLabel}</span></span>
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-[#f2f3f7] text-neutral-950">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {mobileOpen ? <div className="fixed inset-0 z-50 lg:hidden"><button className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"/><div className="relative h-full w-[276px] shadow-2xl">{sidebar}</div></div> : null}

      <div className="lg:pl-[276px]">
        <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center gap-3 px-4 sm:px-6 xl:px-8">
            <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-neutral-200 bg-white p-2.5 text-neutral-700 shadow-sm lg:hidden" aria-label="Menüyü aç"><Icon name="menu"/></button>
            <div className="hidden max-w-[420px] flex-1 items-center gap-2 rounded-[14px] border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-neutral-400 md:flex"><Icon name="search" className="size-4"/><span className="text-xs">Panelde ara...</span><span className="ml-auto rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-neutral-400">⌘K</span></div>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/" target="_blank" className="hidden items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs font-bold text-neutral-600 shadow-sm transition hover:border-neutral-300 hover:text-neutral-950 sm:flex">Siteyi aç <Icon name="external" className="size-4"/></Link>
              <form action={logoutAction}><button type="submit" className="flex items-center gap-2 rounded-xl bg-neutral-950 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800"><Icon name="logout" className="size-4"/><span className="hidden sm:inline">Çıkış</span></button></form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1640px] px-4 py-6 sm:px-6 sm:py-8 xl:px-8">{children}</main>
      </div>
    </div>
  );
}
