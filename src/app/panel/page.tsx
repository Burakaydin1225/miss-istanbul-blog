import Link from "next/link";

import { ContentStatus, ContentType } from "@/lib/content-enums";
import { requireUser } from "@/lib/auth";
import { contentPath, contentStatusLabel } from "@/lib/content";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date | null): string {
  if (!date) return "Henüz yayınlanmadı";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function contentTextLength(value: unknown): number {
  if (typeof value === "string") return value.replace(/<[^>]+>/g, " ").trim().length;
  return JSON.stringify(value ?? "").length;
}

function seoScore(item: {
  title: string;
  excerpt: string | null;
  content: unknown;
  coverImage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
}): number {
  let score = 0;
  const title = item.seoTitle?.trim() || item.title.trim();
  const description = item.seoDescription?.trim() || item.excerpt?.trim() || "";
  const length = contentTextLength(item.content);

  if (title.length >= 30 && title.length <= 65) score += 25;
  else if (title.length >= 15) score += 12;

  if (description.length >= 120 && description.length <= 170) score += 25;
  else if (description.length >= 70) score += 12;

  if (length >= 1200) score += 25;
  else if (length >= 500) score += 15;
  else if (length >= 200) score += 8;

  if (item.coverImage) score += 10;
  if (!item.canonicalUrl || item.canonicalUrl.startsWith("https://")) score += 10;
  if (!item.noIndex) score += 5;

  return Math.min(100, score);
}

function scoreClass(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export default async function PanelDashboard() {
  await requireUser();
  const now = new Date();

  const [posts, redirects] = await Promise.all([
    prisma.contentPost.findMany({
      where: { type: ContentType.BLOG },
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        slug: true,
        excerpt: true,
        content: true,
        coverImage: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        noIndex: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.seoRedirect.count({ where: { isActive: true } }),
  ]);

  const published = posts.filter(
    (post) =>
      post.status === ContentStatus.PUBLISHED &&
      (!post.publishedAt || post.publishedAt <= now),
  );
  const drafts = posts.filter((post) => post.status === ContentStatus.DRAFT);
  const scheduled = posts.filter(
    (post) => post.status === ContentStatus.PUBLISHED && post.publishedAt && post.publishedAt > now,
  );
  const blogCount = posts.filter((post) => post.type === ContentType.BLOG).length;
  const scored = posts.map((post) => ({ ...post, score: seoScore(post) }));
  const averageSeo = scored.length
    ? Math.round(scored.reduce((sum, post) => sum + post.score, 0) / scored.length)
    : 0;
  const weakCount = scored.filter((post) => post.score < 80).length;
  const recent = scored.slice(0, 6);

  const cards = [
    { label: "Toplam yazı", value: posts.length, hint: `${blogCount} blog yazısı` },
    { label: "Yayında", value: published.length, hint: `${scheduled.length} planlanmış` },
    { label: "Taslak", value: drafts.length, hint: "Yayın bekleyen içerik" },
    { label: "SEO ortalaması", value: `${averageSeo}/100`, hint: `${weakCount} geliştirilmesi gereken` },
  ];

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Premium Blog</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">İçerik kontrol merkezi</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">Yazıları, yayın durumlarını ve SEO sağlığını tek ekrandan takip et.</p>
        </div>
        <Link href="/panel/icerikler/yeni" className="inline-flex items-center justify-center rounded-2xl bg-neutral-950 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-neutral-800">Yeni yazı oluştur</Link>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-neutral-500">{card.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight text-neutral-950">{card.value}</p>
            <p className="mt-2 text-xs text-neutral-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <div><h2 className="font-extrabold text-neutral-950">Son güncellenen yazılar</h2><p className="mt-1 text-xs text-neutral-400">En son çalıştığın içerikler</p></div>
            <Link href="/panel/icerikler" className="text-xs font-bold text-amber-700">Tümünü gör</Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-neutral-100">
              {recent.map((post) => (
                <div key={post.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-neutral-400"><span>{post.type === ContentType.GUIDE ? "Rehber" : "Blog"}</span><span>•</span><span>{contentStatusLabel(post.status)}</span></div>
                    <h3 className="mt-1 truncate font-bold text-neutral-950">{post.title}</h3>
                    <p className="mt-1 text-xs text-neutral-400">{formatDate(post.publishedAt)}</p>
                  </div>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${scoreClass(post.score)}`}>SEO {post.score}</span>
                  <div className="flex gap-2">
                    <Link href={contentPath(post.type, post.slug)} target="_blank" className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600">Görüntüle</Link>
                    <Link href={`/panel/icerikler/${post.id}`} className="rounded-xl bg-neutral-950 px-3 py-2 text-xs font-bold text-white">Düzenle</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="p-10 text-center text-sm text-neutral-500">Henüz yazı eklenmedi.</p>}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-[#17181c] p-6 text-white shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-300">SEO Sağlığı</p>
            <div className="mt-5 flex items-end justify-between"><div><p className="text-5xl font-black">{averageSeo}</p><p className="mt-1 text-xs text-white/45">100 üzerinden ortalama</p></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">{weakCount} görev</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-500" style={{ width: `${averageSeo}%` }} /></div>
            <Link href="/panel/seo" className="mt-5 flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-extrabold text-neutral-950">SEO merkezini aç</Link>
          </div>

          <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="font-extrabold text-neutral-950">Hızlı durum</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-neutral-500">Aktif yönlendirme</span><strong>{redirects}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-500">Noindex içerik</span><strong>{posts.filter((post) => post.noIndex).length}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-500">Kapak görselsiz</span><strong>{posts.filter((post) => !post.coverImage).length}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-500">Meta açıklamasız</span><strong>{posts.filter((post) => !post.seoDescription && !post.excerpt).length}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
