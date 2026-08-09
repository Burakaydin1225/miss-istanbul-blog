import type { Metadata } from "next";
import type { ReactNode } from "react";

import PanelShell from "@/app/panel/PanelShell";
import { UserRole } from "@/generated/prisma/client";
import { isOwner, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Miss İstanbul Blog Yönetimi",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Editör",
  [UserRole.VIEWER]: "Görüntüleyici",
};

const roleBadgeClassNames: Record<UserRole, string> = {
  [UserRole.OWNER]: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  [UserRole.ADMIN]: "border-blue-400/25 bg-blue-400/10 text-blue-200",
  [UserRole.EDITOR]: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  [UserRole.VIEWER]: "border-white/10 bg-white/5 text-white/50",
};

type PanelLayoutProps = { children: ReactNode };

export default async function PanelLayout({ children }: PanelLayoutProps) {
  const user = await requireUser();
  const canViewSystemLogs = isOwner(user.role);

  const groups = [
    {
      label: "İçerik",
      items: [
        { href: "/panel", label: "Genel Bakış", icon: "dashboard" as const },
        { href: "/panel/icerikler", label: "Yazılar", icon: "content" as const },
        { href: "/panel/icerikler/yeni", label: "Yeni Yazı", icon: "listing" as const },
      ],
    },
    {
      label: "SEO",
      items: [
        { href: "/panel/seo", label: "SEO Otomasyon", icon: "seo" as const, badge: "CORE" },
      ],
    },
    {
      label: "Sistem",
      items: [
        { href: "/panel/hesabim", label: "Hesabım", icon: "account" as const },
        ...(canViewSystemLogs
          ? [{ href: "/panel/sistem-hareketleri", label: "İçerik Hareketleri", icon: "logs" as const }]
          : []),
      ],
    },
  ];

  return (
    <PanelShell
      userName={user.name}
      roleLabel={roleLabels[user.role]}
      roleClassName={roleBadgeClassNames[user.role]}
      groups={groups}
    >
      {children}
    </PanelShell>
  );
}
