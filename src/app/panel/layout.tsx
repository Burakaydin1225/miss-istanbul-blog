import type { Metadata } from "next";
import type { ReactNode } from "react";

import PanelShell from "@/app/panel/PanelShell";
import { UserRole } from "@/generated/prisma/client";
import { isAdmin, isOwner, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Yönetim Paneli",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

const roleLabels: Record<UserRole, string> = {
  [UserRole.OWNER]: "Ana Yönetici",
  [UserRole.ADMIN]: "Admin",
  [UserRole.EDITOR]: "Düzenleyici",
  [UserRole.VIEWER]: "Görüntüleyici",
};

const roleBadgeClassNames: Record<UserRole, string> = {
  [UserRole.OWNER]: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  [UserRole.ADMIN]: "border-blue-400/25 bg-blue-400/10 text-blue-200",
  [UserRole.EDITOR]: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  [UserRole.VIEWER]: "border-white/10 bg-white/5 text-white/50",
};

type PanelLayoutProps = { children: ReactNode };

export default async function PanelLayout({ children }: PanelLayoutProps) {
  const user = await requireUser();
  const canManage = isAdmin(user.role);
  const canViewSystemLogs = isOwner(user.role);

  const groups = [
    {
      label: "Çalışma alanı",
      items: [
        { href: "/panel", label: "Genel Bakış", icon: "dashboard" as const },
        { href: "/panel/ilanlar", label: "İlan Yönetimi", icon: "listing" as const },
        { href: "/panel/icerikler", label: "İçerik Merkezi", icon: "content" as const },
      ],
    },
    {
      label: "Büyüme",
      items: [
        { href: "/panel/seo", label: "SEO Otomasyon", icon: "seo" as const, badge: "CORE" },
        { href: "/panel/istatistikler", label: "İstatistikler", icon: "analytics" as const },
        { href: "/panel/fiyat-onerileri", label: "Fiyat Önerileri", icon: "pricing" as const },
      ],
    },
    ...(canManage ? [{
      label: "Yapılandırma",
      items: [
        { href: "/panel/ilceler", label: "İlçeler", icon: "district" as const },
        { href: "/panel/kategoriler", label: "Kategoriler", icon: "category" as const },
        { href: "/panel/reklam-konumlari", label: "Reklam Konumları", icon: "placement" as const },
        { href: "/panel/site-ayarlari", label: "Site Ayarları", icon: "settings" as const },
      ],
    }] : []),
    {
      label: "Sistem",
      items: [
        { href: "/panel/hesabim", label: "Hesabım", icon: "account" as const },
        ...(canManage ? [{ href: "/panel/kullanicilar", label: "Kullanıcılar", icon: "users" as const }] : []),
        ...(canViewSystemLogs ? [{ href: "/panel/sistem-hareketleri", label: "Sistem Hareketleri", icon: "logs" as const }] : []),
      ],
    },
  ];

  return <PanelShell userName={user.name} roleLabel={roleLabels[user.role]} roleClassName={roleBadgeClassNames[user.role]} groups={groups}>{children}</PanelShell>;
}
