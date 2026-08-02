import Image from "next/image";
import Link from "next/link";

import { BulkSelectionControls } from "@/app/panel/urunler/BulkSelectionControls";
import { DeleteProductForm } from "@/app/panel/urunler/DeleteProductForm";
import { QuickStatusForm } from "@/app/panel/urunler/QuickStatusForm";
import { canRemoveProducts, canWriteProducts, requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type PageSearchParams = Promise<Record<string, string | string[] | undefined>>;

type ListingStatusValue = "ALL" | "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
type TierValue = "ALL" | "VIP" | "PREMIUM" | "GOLD";
type SeoValue = "ALL" | "GOOD" | "NEEDS_WORK";

type ProductsPageProps = {
  searchParams: PageSearchParams;
};

function getParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatDate(date: Date | null): string {
  if (!date) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function getDaysUntil(date: Date | null, now: Date): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86_400_000);
}

function getSeoScore(product: {
  name: string;
  shortDescription: string | null;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
  coverImage: string;
  images: Array<{ altText: string | null }>;
  districtId: string | null;
  categoryId: string | null;
}): number {
  let score = 0;
  const title = product.seoTitle?.trim() || product.name.trim();
  const description = product.seoDescription?.trim() || product.shortDescription?.trim() || "";

  if (title.length >= 30 && title.length <= 65) score += 20;
  else if (title.length >= 15) score += 10;

  if (description.length >= 120 && description.length <= 170) score += 20;
  else if (description.length >= 70) score += 10;

  if (product.description.trim().length >= 250) score += 15;
  else if (product.description.trim().length >= 100) score += 8;

  if (product.coverImage.trim()) score += 10;

  const imageCount = product.images.length;
  const imagesWithAlt = product.images.filter((image) => Boolean(image.altText?.trim())).length;
  if (imageCount === 0 || imagesWithAlt === imageCount) score += 10;
  else if (imagesWithAlt > 0) score += 5;

  if (product.districtId) score += 10;
  if (product.categoryId) score += 10;
  if (product.canonicalUrl?.startsWith("https://")) score += 3;
  if (!product.noIndex) score += 2;

  return Math.min(100, score);
}

function statusLabel(status: string): string {
  return {
    DRAFT: "Taslak",
    PUBLISHED: "Yayında",
    PAUSED: "Durduruldu",
    ARCHIVED: "Arşiv",
  }[status] ?? status;
}

function statusClassName(status: string): string {
  return {
    DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
    PUBLISHED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PAUSED: "border-orange-200 bg-orange-50 text-orange-700",
    ARCHIVED: "border-neutral-200 bg-neutral-100 text-neutral-600",
  }[status] ?? "border-neutral-200 bg-neutral-50 text-neutral-600";
}

function seoClassName(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-red-50 text-red-700 ring-red-200";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const now = new Date();

  const query = getParam(params.q).trim();
  const districtId = getParam(params.district);
  const categoryId = getParam(params.category);
  const status = (getParam(params.status) || "ALL") as ListingStatusValue;
  const tier = (getParam(params.tier) || "ALL") as TierValue;
  const seo = (getParam(params.seo) || "ALL") as SeoValue;
  const page = Math.max(1, Number.parseInt(getParam(params.page) || "1", 10) || 1);

  const [allProducts, districts, listingCategories, analyticsGroups] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { slug: { contains: query, mode: "insensitive" } },
                { whatsappNumber: { contains: query } },
                { whatsappButtons: { some: { phoneNumber: { contains: query } } } },
              ],
            }
          : {}),
        ...(districtId ? { districtId } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(status !== "ALL" ? { status } : {}),
        ...(tier !== "ALL" ? { category: tier } : {}),
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        district: { select: { name: true, slug: true } },
        listingCategory: { select: { name: true, slug: true } },
        images: { select: { altText: true } },
        _count: { select: { images: true, payments: true } },
      },
    }),
    prisma.district.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.listingCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.analyticsEvent.groupBy({
      by: ["productId", "eventType"],
      where: { productId: { not: null }, eventType: { in: ["PRODUCT_VIEW", "WHATSAPP_CLICK"] } },
      _count: { _all: true },
    }),
  ]);

  const analyticsByProduct = new Map<string, { views: number; whatsapp: number }>();
  for (const row of analyticsGroups) {
    if (!row.productId) continue;
    const current = analyticsByProduct.get(row.productId) ?? { views: 0, whatsapp: 0 };
    if (row.eventType === "PRODUCT_VIEW") current.views = row._count._all;
    if (row.eventType === "WHATSAPP_CLICK") current.whatsapp = row._count._all;
    analyticsByProduct.set(row.productId, current);
  }

  const scoredProducts = allProducts.map((product) => ({ product, seoScore: getSeoScore(product) }));
  const filteredProducts = scoredProducts.filter(({ seoScore }) => {
    if (seo === "GOOD") return seoScore >= 80;
    if (seo === "NEEDS_WORK") return seoScore < 80;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleProducts = filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeCount = allProducts.filter((product) => product.status === "PUBLISHED" && product.isActive).length;
  const vipCount = allProducts.filter((product) => product.category === "VIP").length;
  const premiumCount = allProducts.filter((product) => product.category === "PREMIUM").length;
  const expiringCount = allProducts.filter((product) => {
    const days = getDaysUntil(product.expiresAt ?? product.subscriptionEndsAt, now);
    return days !== null && days >= 0 && days <= 7;
  }).length;
  const lowSeoCount = scoredProducts.filter(({ seoScore }) => seoScore < 80).length;

  const canEdit = canWriteProducts(user.role);
  const canDelete = canRemoveProducts(user.role);

  const buildPageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (districtId) next.set("district", districtId);
    if (categoryId) next.set("category", categoryId);
    if (status !== "ALL") next.set("status", status);
    if (tier !== "ALL") next.set("tier", tier);
    if (seo !== "ALL") next.set("seo", seo);
    next.set("page", String(targetPage));
    return `/panel/urunler?${next.toString()}`;
  };

  return (
    <section>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">İlan yönetimi</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">İlanlar</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
            Yayın durumunu, ilçe ve kategori bilgisini, SEO kalitesini ve ilan performansını tek ekrandan takip edin.
          </p>
        </div>

        {canEdit ? (
          <Link href="/panel/urunler/yeni" className="flex h-11 items-center justify-center rounded-xl bg-neutral-950 px-5 text-sm font-semibold text-white transition hover:bg-neutral-800">
            Yeni ilan ekle
          </Link>
        ) : null}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <SummaryCard label="Toplam ilan" value={formatNumber(allProducts.length)} description="Filtreye uyan kayıt" />
        <SummaryCard label="Aktif" value={formatNumber(activeCount)} description="Yayında ve aktif" />
        <SummaryCard label="VIP" value={formatNumber(vipCount)} description="VIP seviyesindeki ilan" />
        <SummaryCard label="Premium" value={formatNumber(premiumCount)} description="Premium seviyesindeki ilan" />
        <SummaryCard label="7 gün içinde biten" value={formatNumber(expiringCount)} description="Yenileme gerektiren" />
        <SummaryCard label="SEO geliştirilmeli" value={formatNumber(lowSeoCount)} description="80 puanın altında" />
      </div>

      <form className="mt-6 grid gap-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-black/[0.05] md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))_auto]">
        <input name="q" defaultValue={query} placeholder="Başlık, slug veya telefon ara" className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-500" />
        <Select name="district" defaultValue={districtId} label="Tüm ilçeler" options={districts.map((item) => ({ value: item.id, label: item.name }))} />
        <Select name="category" defaultValue={categoryId} label="Tüm kategoriler" options={listingCategories.map((item) => ({ value: item.id, label: item.name }))} />
        <Select name="status" defaultValue={status} label="Tüm durumlar" options={[{ value: "PUBLISHED", label: "Yayında" }, { value: "DRAFT", label: "Taslak" }, { value: "PAUSED", label: "Durduruldu" }, { value: "ARCHIVED", label: "Arşiv" }]} />
        <Select name="tier" defaultValue={tier} label="Tüm seviyeler" options={[{ value: "VIP", label: "VIP" }, { value: "PREMIUM", label: "Premium" }, { value: "GOLD", label: "Gold" }]} />
        <Select name="seo" defaultValue={seo} label="Tüm SEO puanları" options={[{ value: "GOOD", label: "İyi (80+)" }, { value: "NEEDS_WORK", label: "Geliştirilmeli" }]} />
        <div className="flex gap-2">
          <button className="h-11 flex-1 rounded-xl bg-neutral-950 px-4 text-sm font-semibold text-white">Filtrele</button>
          <Link href="/panel/urunler" className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-3 text-sm font-medium text-neutral-600">Temizle</Link>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-[24px] bg-white shadow-sm ring-1 ring-black/[0.05]">
        <div className="hidden grid-cols-[28px_minmax(240px,1.4fr)_140px_140px_125px_105px_110px_120px_170px] gap-3 border-b border-neutral-100 bg-neutral-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 xl:grid">
          <span>Seç</span><span>İlan</span><span>Konum</span><span>Kategori</span><span>Durum</span><span>SEO</span><span>Performans</span><span>Bitiş</span><span>İşlemler</span>
        </div>

        {visibleProducts.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {visibleProducts.map(({ product, seoScore }) => {
              const analytics = analyticsByProduct.get(product.id) ?? { views: 0, whatsapp: 0 };
              const endDate = product.expiresAt ?? product.subscriptionEndsAt;
              const daysLeft = getDaysUntil(endDate, now);

              return (
                <article key={product.id} className="grid gap-4 px-4 py-4 transition hover:bg-neutral-50/70 sm:px-5 xl:grid-cols-[28px_minmax(240px,1.4fr)_140px_140px_125px_105px_110px_120px_170px] xl:items-center xl:gap-3">
                  {canEdit ? (
                    <input type="checkbox" name="productIds" value={product.id} aria-label={`${product.name} ilanını seç`} className="size-4 rounded border-neutral-300" />
                  ) : <span />}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
                      <Image src={product.coverImage} alt={product.name} fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-neutral-950">{product.name}</h2>
                        <span className="rounded-full bg-neutral-950 px-2 py-0.5 text-[9px] font-bold text-white">{product.category}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-neutral-400">/{product.slug}</p>
                      <p className="mt-1 text-[11px] text-neutral-500">Öncelik: {product.priority} · {product._count.images + 1} görsel</p>
                    </div>
                  </div>

                  <Cell label="Konum" value={product.district?.name ?? "Atanmamış"} subvalue={product.region ?? undefined} />
                  <Cell label="Kategori" value={product.listingCategory?.name ?? "Atanmamış"} />
                  <div className="flex flex-col gap-2">
                    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClassName(product.status)}`}>{statusLabel(product.status)}</span>
                    {canEdit ? <QuickStatusForm productId={product.id} status={product.status} /> : null}
                  </div>
                  <div className={`inline-flex w-fit items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-bold ring-1 ${seoClassName(seoScore)}`}><span>{seoScore}</span><span className="text-[10px]">/100</span></div>
                  <Cell label="Performans" value={`${formatNumber(analytics.views)} görüntüleme`} subvalue={`${formatNumber(analytics.whatsapp)} WhatsApp`} />
                  <div>
                    <p className="text-xs font-semibold text-neutral-800">{formatDate(endDate)}</p>
                    <p className={`mt-1 text-[10px] ${daysLeft !== null && daysLeft <= 3 ? "font-semibold text-red-600" : "text-neutral-400"}`}>
                      {daysLeft === null ? "Süresiz" : daysLeft < 0 ? "Süresi doldu" : daysLeft === 0 ? "Bugün bitiyor" : `${daysLeft} gün kaldı`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <Link href={`/panel/urunler/${product.id}`} className="rounded-lg bg-neutral-950 px-3 py-2 text-[11px] font-semibold text-white">Detay</Link>
                    <Link href={`/ilan/${product.slug}`} target="_blank" className="rounded-lg border border-neutral-200 px-3 py-2 text-[11px] font-medium text-neutral-600">Görüntüle</Link>
                    {canEdit ? <Link href={`/panel/urunler/${product.id}/duzenle`} className="rounded-lg border border-neutral-200 px-3 py-2 text-[11px] font-medium text-neutral-700">Düzenle</Link> : null}
                    {canDelete ? <DeleteProductForm productId={product.id} productName={product.name} /> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-semibold text-neutral-700">Bu filtrelerle eşleşen ilan bulunamadı.</p>
            <Link href="/panel/urunler" className="mt-3 inline-flex text-sm font-semibold text-neutral-950 underline">Filtreleri temizle</Link>
          </div>
        )}
      </div>

      <BulkSelectionControls canEdit={canEdit} />

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">Sayfa {safePage} / {totalPages} · {filteredProducts.length} sonuç</p>
          <div className="flex gap-2">
            {safePage > 1 ? <Link href={buildPageHref(safePage - 1)} className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">Önceki</Link> : null}
            {safePage < totalPages ? <Link href={buildPageHref(safePage + 1)} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Sonraki</Link> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value, description }: { label: string; value: string; description: string }) {
  return <div className="rounded-[18px] bg-white p-4 shadow-sm ring-1 ring-black/[0.05]"><p className="text-[11px] font-medium text-neutral-500">{label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">{value}</p><p className="mt-1 text-[10px] leading-4 text-neutral-400">{description}</p></div>;
}

function Select({ name, defaultValue, label, options }: { name: string; defaultValue: string; label: string; options: Array<{ value: string; label: string }> }) {
  return <select name={name} defaultValue={defaultValue} className="h-11 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-neutral-500"><option value="ALL">{label}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
}

function Cell({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) {
  return <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 xl:hidden">{label}</p><p className="truncate text-xs font-semibold text-neutral-800">{value}</p>{subvalue ? <p className="mt-1 truncate text-[10px] text-neutral-400">{subvalue}</p> : null}</div>;
}
