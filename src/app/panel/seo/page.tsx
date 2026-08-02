import Link from "next/link";

import { ContentStatus, ListingStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ListingForAudit = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  coverImage: string;
  coverImageAlt: string | null;
  districtId: string | null;
  categoryId: string | null;
  images: Array<{ altText: string | null }>;
};

function listingSeoScore(item: ListingForAudit): number {
  let score = 0;
  const title = item.seoTitle?.trim() || item.name.trim();
  const description = item.seoDescription?.trim() || item.shortDescription?.trim() || "";

  if (title.length >= 30 && title.length <= 65) score += 20;
  else if (title.length >= 15) score += 10;

  if (description.length >= 120 && description.length <= 170) score += 20;
  else if (description.length >= 70) score += 10;

  if (item.description.trim().length >= 250) score += 15;
  else if (item.description.trim().length >= 100) score += 8;

  if (item.coverImage.trim()) score += 8;
  if (item.coverImageAlt?.trim()) score += 4;

  const altCount = item.images.filter((image) => image.altText?.trim()).length;
  if (item.images.length === 0 || altCount === item.images.length) score += 8;
  else if (altCount > 0) score += 4;

  if (item.districtId) score += 10;
  if (item.categoryId) score += 10;
  if (!item.canonicalUrl || item.canonicalUrl.startsWith("https://")) score += 3;
  if (!item.noIndex) score += 2;

  return Math.min(100, score);
}

function contentSeoScore(item: {
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
  const contentText = typeof item.content === "string" ? item.content : JSON.stringify(item.content ?? "");

  if (title.length >= 30 && title.length <= 65) score += 25;
  else if (title.length >= 15) score += 12;

  if (description.length >= 120 && description.length <= 170) score += 25;
  else if (description.length >= 70) score += 12;

  if (contentText.length >= 1200) score += 25;
  else if (contentText.length >= 500) score += 15;
  else if (contentText.length >= 200) score += 8;

  if (item.coverImage) score += 10;
  if (!item.canonicalUrl || item.canonicalUrl.startsWith("https://")) score += 10;
  if (!item.noIndex) score += 5;

  return Math.min(100, score);
}

function scoreClass(score: number): string {
  if (score >= 80) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (score >= 60) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export default async function SeoCenterPage() {
  await requireUser();

  const now = new Date();
  const [listings, contents, districts, categories, redirects] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, status: ListingStatus.PUBLISHED },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        canonicalUrl: true,
        noIndex: true,
        coverImage: true,
        coverImageAlt: true,
        districtId: true,
        categoryId: true,
        images: { select: { altText: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.contentPost.findMany({
      where: {
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
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.district.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, description: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.listingCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, seoTitle: true, seoDescription: true, description: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.seoRedirect.count({ where: { isActive: true } }),
  ]);

  const listingRows = listings.map((item) => ({ ...item, score: listingSeoScore(item) }));
  const contentRows = contents.map((item) => ({ ...item, score: contentSeoScore(item) }));
  const lowListings = listingRows.filter((item) => item.score < 80).sort((a, b) => a.score - b.score);
  const lowContents = contentRows.filter((item) => item.score < 80).sort((a, b) => a.score - b.score);
  const weakDistricts = districts.filter((item) => !item.seoTitle || !item.seoDescription || !item.description);
  const weakCategories = categories.filter((item) => !item.seoTitle || !item.seoDescription || !item.description);
  const indexedListings = listings.filter((item) => !item.noIndex).length;
  const indexedContents = contents.filter((item) => !item.noIndex).length;

  const overallScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        ((indexedListings + indexedContents) * 100) /
          Math.max(1, listings.length + contents.length) -
          (lowListings.length + lowContents.length) * 1.5 -
          (weakDistricts.length + weakCategories.length) * 0.75,
      ),
    ),
  );

  const healthLabel = overallScore >= 85 ? "Mükemmel" : overallScore >= 70 ? "İyi" : overallScore >= 50 ? "Geliştirilmeli" : "Kritik";
  const totalIssues = lowListings.length + lowContents.length + weakDistricts.length + weakCategories.length;

  const cards = [
    { label: "SEO sağlık puanı", value: `${overallScore}/100`, detail: healthLabel, tone: "fuchsia" },
    { label: "İndekslenebilir sayfa", value: indexedListings + indexedContents, detail: `${listings.length + contents.length} yayındaki sayfa`, tone: "emerald" },
    { label: "Bekleyen iyileştirme", value: totalIssues, detail: "İlan, içerik ve taksonomi", tone: "amber" },
    { label: "Aktif yönlendirme", value: redirects, detail: "301 / 308 SEO kuralı", tone: "blue" },
  ] as const;

  const toneClasses = {
    fuchsia: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
  } as const;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[#15161b] p-6 text-white shadow-xl shadow-black/5 sm:p-8">
        <div className="absolute -right-16 -top-20 size-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 size-40 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-200">SEO Automation Center</span>
              <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold text-white/55"><span className="size-1.5 rounded-full bg-emerald-400" /> Sistem aktif</span>
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Organik büyümeyi tek merkezden yönet.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">İlanlar, içerikler, ilçeler ve kategoriler için SEO açıklarını otomatik tespit et; en yüksek etkiye sahip işleri önce tamamla.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/sitemap.xml" target="_blank" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">Sitemap’i görüntüle</Link>
            <Link href="/robots.txt" target="_blank" className="rounded-xl bg-white px-4 py-2.5 text-xs font-black text-neutral-950 transition hover:bg-neutral-100">Robots.txt kontrolü</Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-[22px] border border-black/[0.055] bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-neutral-500">{card.label}</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.045em] text-neutral-950">{card.value}</p>
                <p className="mt-1.5 text-[11px] text-neutral-400">{card.detail}</p>
              </div>
              <span className={`flex size-10 items-center justify-center rounded-[14px] text-xs font-black ring-1 ${toneClasses[card.tone]}`}>{card.label.slice(0, 1)}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.75fr)]">
        <article className="rounded-[26px] border border-black/[0.055] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-600">Öncelik kuyruğu</p>
              <h2 className="mt-1.5 text-xl font-black tracking-[-0.03em] text-neutral-950">En hızlı sonuç verecek düzeltmeler</h2>
            </div>
            <Link href="/panel/ilanlar?seo=NEEDS_WORK" className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-950">Tüm sorunları aç</Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-[18px] border border-neutral-100">
            <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px] bg-neutral-50 px-4 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-400 sm:grid">
              <span>Sayfa</span><span>SEO puanı</span><span className="text-right">İşlem</span>
            </div>
            <div className="divide-y divide-neutral-100">
              {[...lowListings.slice(0, 5).map((item) => ({ id: item.id, title: item.name, path: `/ilan/${item.slug}`, score: item.score, edit: `/panel/ilanlar/${item.id}`, kind: "İlan" })), ...lowContents.slice(0, 3).map((item) => ({ id: item.id, title: item.title, path: item.type === "BLOG" ? `/blog/${item.slug}` : `/rehber/${item.slug}`, score: item.score, edit: `/panel/icerikler/${item.id}`, kind: item.type === "BLOG" ? "Blog" : "Rehber" }))]
                .sort((a, b) => a.score - b.score)
                .slice(0, 8)
                .map((item) => (
                  <div key={`${item.kind}-${item.id}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_110px_120px] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="rounded-md bg-neutral-100 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-neutral-500">{item.kind}</span><p className="truncate text-sm font-bold text-neutral-900">{item.title}</p></div>
                      <p className="mt-1 truncate text-[11px] text-neutral-400">{item.path}</p>
                    </div>
                    <div><span className={`inline-flex min-w-12 justify-center rounded-xl border px-2.5 py-1.5 text-xs font-black ${scoreClass(item.score)}`}>{item.score}</span></div>
                    <div className="sm:text-right"><Link href={item.edit} className="inline-flex rounded-xl bg-neutral-950 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-neutral-800">Optimize et</Link></div>
                  </div>
                ))}
              {lowListings.length + lowContents.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-black text-emerald-700">Tüm sayfalar hedef puanın üzerinde.</p><p className="mt-1 text-xs text-neutral-400">SEO kuyruğunda bekleyen iş bulunmuyor.</p></div> : null}
            </div>
          </div>
        </article>

        <aside className="space-y-6">
          <article className="rounded-[26px] border border-black/[0.055] bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-neutral-500">Genel SEO sağlığı</p><p className="mt-2 text-4xl font-black tracking-[-0.05em] text-neutral-950">{overallScore}</p></div><div className="relative flex size-24 items-center justify-center rounded-full" style={{ background: `conic-gradient(#c026d3 ${overallScore * 3.6}deg, #f1f1f4 0deg)` }}><div className="flex size-[72px] items-center justify-center rounded-full bg-white text-xs font-black text-neutral-700">{healthLabel}</div></div></div>
            <div className="mt-6 space-y-3">
              <HealthRow label="İlan indeksleme" value={`${indexedListings}/${listings.length}`} good={indexedListings === listings.length} />
              <HealthRow label="İçerik indeksleme" value={`${indexedContents}/${contents.length}`} good={indexedContents === contents.length} />
              <HealthRow label="İlçe eksikleri" value={String(weakDistricts.length)} good={weakDistricts.length === 0} />
              <HealthRow label="Kategori eksikleri" value={String(weakCategories.length)} good={weakCategories.length === 0} />
            </div>
          </article>

          <article className="rounded-[26px] bg-gradient-to-br from-fuchsia-600 to-violet-700 p-6 text-white shadow-lg shadow-fuchsia-600/15">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">Otomasyon önerisi</p>
            <h3 className="mt-3 text-lg font-black tracking-tight">Önce düşük puanlı ilanları tamamla.</h3>
            <p className="mt-2 text-xs leading-5 text-white/65">İlk {Math.min(5, lowListings.length)} ilanı 80 puanın üzerine çıkarmak, en hızlı uygulanabilir teknik kazanım.</p>
            <Link href="/panel/ilanlar?seo=NEEDS_WORK" className="mt-5 inline-flex rounded-xl bg-white px-4 py-2.5 text-xs font-black text-fuchsia-700">İş kuyruğunu başlat</Link>
          </article>
        </aside>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <TaxonomyAudit title="İlçe SEO eksikleri" description="Başlık, meta açıklama veya içerik alanı eksik ilçeler" items={weakDistricts.map((item) => ({ id: item.id, name: item.name }))} href="/panel/ilceler" empty="Tüm ilçe sayfaları eksiksiz." />
        <TaxonomyAudit title="Kategori SEO eksikleri" description="Başlık, meta açıklama veya içerik alanı eksik kategoriler" items={weakCategories.map((item) => ({ id: item.id, name: item.name }))} href="/panel/kategoriler" empty="Tüm kategori sayfaları eksiksiz." />
      </section>
    </div>
  );
}

function HealthRow({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3.5 py-3"><span className="text-xs font-semibold text-neutral-500">{label}</span><span className={`text-xs font-black ${good ? "text-emerald-600" : "text-amber-600"}`}>{value}</span></div>;
}

function TaxonomyAudit({ title, description, items, href, empty }: { title: string; description: string; items: Array<{ id: string; name: string }>; href: string; empty: string }) {
  return (
    <article className="rounded-[26px] border border-black/[0.055] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black tracking-tight text-neutral-950">{title}</h2><p className="mt-1 text-xs leading-5 text-neutral-400">{description}</p></div><Link href={href} className="shrink-0 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-600">Yönet</Link></div>
      <div className="mt-5 flex flex-wrap gap-2">{items.slice(0, 24).map((item) => <Link key={item.id} href={href} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-amber-700 transition hover:border-amber-300">{item.name}</Link>)}{items.length === 0 ? <span className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700">{empty}</span> : null}</div>
    </article>
  );
}
