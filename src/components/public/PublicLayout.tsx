import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#f6f5f2] text-neutral-950"><SiteHeader />{children}<SiteFooter /></div>;
}
