import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-lg font-black">{siteConfig.name}</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">{siteConfig.description}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-neutral-600">
          <Link href="/hakkimizda">Hakkımızda</Link>
          <Link href="/iletisim">İletişim</Link>
          <Link href="/gizlilik-politikasi">Gizlilik</Link>
          <Link href="/kullanim-kosullari">Koşullar</Link>
        </div>
      </div>
      <div className="border-t border-neutral-100 px-4 py-5 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {siteConfig.name}. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
