import Link from "next/link";

import { ContentStatus, ContentType } from "@/lib/content-enums";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function contentTextLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/<[^>]+>/g, " ").trim().length;
  return JSON.stringify(value ?? "").length;
}

function score(item: {
  title: string;
  excerpt: string | null;
  content: unknown;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}): { value: number; issues: string[] } {
  let value = 0;
  const issues: string[] = [];
  const title = item.seoTitle?.trim() || item.title.trim();
  const description = item.seoDescription?.trim() || item.excerpt?.trim() || "";
  const length = contentTextLength(item.content);

  if (title.length >= 30 && title.length <= 65) value += 25;
  else { value += title.length >= 15 ? 12 : 0; issues.push("Başlık uzunluğu uygun değil"); }

  if (description.length >= 120 && description.length <= 170) value += 25;
  else { value += description.length >= 70 ? 12 : 0; issues.push("Meta açıklaması eksik veya kısa"); }

  if (length >= 1200) value += 25;
  else { value += length >= 500 ? 15 : length >= 200 ? 8 : 0; issues.push("İçerik yeterince kapsamlı değil"); }

  if (item.coverImage) value += 10;
  else issues.push("Kapak görseli eksik");

  if (!item.canonicalUrl || item.canonicalUrl.startsWith("https://")) value += 10;
  else issues.push("Canonical URL geçersiz");

  if (!item.noIndex) value += 5;
  else issues.push("Sayfa noindex durumda");

  return { value: Math.min(100, value), issues };
}

function badgeClass(value: number): string {
  if (value >= 80) return "bg-emerald-50 text-emerald-700";
  if (value >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function SeoCenterPage() {
  await requireUser();
  const now = new Date();
  const [posts, redirects] = await Promise.all([
    prisma.contentPost.findMany({
      where: {
        type: ContentType.BLOG,
        status: ContentStatus.PUBLISHED,
        OR: [{ publishedAt: null }, { publishedAt: { lte: now } }],
      },
      select: {
        id: true,
        type: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        noIndex: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.seoRedirect.count({ where: { isActive: true } }),
  ]);

  const rows = posts.map((post) => ({ ...post, ...score(post) }));
  const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.value, 0) / rows.length) : 0;
  const weak = rows.filter((row) => row.value < 80).sort((a, b) => a.value - b.value);
  const missingTitles = rows.filter((row) => !row.seoTitle).length;
  const missingDescriptions = rows.filter((row) => !row.seoDescription && !row.excerpt).length;
  const noImage = rows.filter((row) => !row.coverImage).length;
  const noIndex = rows.filter((row) => row.noIndex).length;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">SEO Otomasyon Merkezi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">Blog SEO sağlığı</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Yayınlanan yazılardaki teknik ve içerik eksiklerini öncelik sırasıyla takip et.</p>
        </div>
        <div className="flex gap-2"><Link href="/sitemap.xml" target="_blank" className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-600">Sitemap</Link><Link href="/robots.txt" target="_blank" className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-neutral-600">Robots.txt</Link></div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-3xl bg-[#17181c] p-5 text-white sm:col-span-2 xl:col-span-1"><p className="text-xs font-bold text-white/45">Genel SEO puanı</p><p className="mt-3 text-4xl font-black">{average}</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-amber-300 to-yellow-500" style={{ width: `${average}%` }}/></div></div>
        {[['Eksik SEO başlığı', missingTitles], ['Eksik meta açıklama', missingDescriptions], ['Kapak görselsiz', noImage], ['Noindex yazı', noIndex]].map(([label, value]) => <div key={String(label)} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs font-bold text-neutral-500">{label}</p><p className="mt-3 text-3xl font-black text-neutral-950">{value}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4"><div><h2 className="font-extrabold text-neutral-950">Öncelikli optimizasyon kuyruğu</h2><p className="mt-1 text-xs text-neutral-400">80 puanın altındaki yayınlar</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{weak.length} görev</span></div>
        {weak.length ? <div className="divide-y divide-neutral-100">{weak.map((post) => <div key={post.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_130px_1fr_auto] lg:items-center"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">{'Blog'}</p><h3 className="mt-1 truncate font-bold text-neutral-950">{post.title}</h3><p className="mt-1 truncate text-xs text-neutral-400">/blog/{post.slug}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${badgeClass(post.value)}`}>SEO {post.value}</span><div className="flex flex-wrap gap-1.5">{post.issues.slice(0,3).map((issue) => <span key={issue} className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold text-neutral-600">{issue}</span>)}</div><Link href={`/panel/icerikler/${post.id}`} className="rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Düzenle</Link></div>)}</div> : <p className="p-10 text-center text-sm text-neutral-500">Tüm yayınlar 80 puanın üzerinde.</p>}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs font-bold text-neutral-500">Yayınlanan içerik</p><p className="mt-2 text-3xl font-black">{rows.length}</p><p className="mt-2 text-xs text-neutral-400">SEO taramasına dahil</p></div>
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs font-bold text-neutral-500">Aktif yönlendirme</p><p className="mt-2 text-3xl font-black">{redirects}</p><p className="mt-2 text-xs text-neutral-400">301/302 kayıtları</p></div>
        <div className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm"><p className="text-xs font-bold text-neutral-500">İyi durumda</p><p className="mt-2 text-3xl font-black">{rows.filter((row) => row.value >= 80).length}</p><p className="mt-2 text-xs text-neutral-400">80 ve üzeri SEO puanı</p></div>
      </section>
    </div>
  );
}
