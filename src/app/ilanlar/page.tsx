import type { Metadata } from "next";
import { ListingCard } from "@/components/public/ListingCard";
import { PlacementListingCard } from "@/components/public/PlacementListingCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import { PlacementType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { activeListingWhere, listingInclude, listingOrderBy } from "@/lib/public-listings";
import { activePlacementWhere, placementInclude } from "@/lib/public-placements";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İstanbul İlanları", description: "İstanbul genelindeki güncel ilanları ilçe ve kategori seçenekleriyle keşfedin.", alternates: { canonical: absoluteUrl("/ilanlar") } };

type Props = { searchParams: Promise<{ ilce?: string; kategori?: string; sayfa?: string }> };
export default async function ListingsPage({ searchParams }: Props) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.sayfa) || 1);
  const pageSize = 24;
  const where = { ...activeListingWhere(), ...(query.ilce ? { district: { slug: query.ilce } } : {}), ...(query.kategori ? { listingCategory: { slug: query.kategori } } : {}) };
  const [placements, listings, count, districts, categories] = await Promise.all([
    prisma.placement.findMany({ where: activePlacementWhere(PlacementType.LISTINGS_FEATURED), include: placementInclude, orderBy: [{ position: "asc" }, { createdAt: "asc" }], take: 8 }),
    prisma.product.findMany({ where, include: listingInclude, orderBy: listingOrderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.product.count({ where }),
    prisma.district.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.listingCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.ceil(count / pageSize);
  const sponsoredIds = new Set(placements.map((item) => item.productId));
  const organicListings = listings.filter((item) => !sponsoredIds.has(item.id));
  return <PublicLayout><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14"><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">İlan vitrini</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">İstanbul ilanları</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">İlçe ve kategori seçerek sonuçları daralt. Filtre sayfaları kullanıcı deneyimi içindir; kalıcı SEO sayfaları temiz URL yapısında sunulur.</p>
  <form className="mt-8 grid gap-3 rounded-3xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" action="/ilanlar"><select name="ilce" defaultValue={query.ilce || ""} className="h-12 rounded-xl border border-neutral-200 px-4 text-sm font-semibold"><option value="">Tüm ilçeler</option>{districts.map(d => <option key={d.id} value={d.slug}>{d.name}</option>)}</select><select name="kategori" defaultValue={query.kategori || ""} className="h-12 rounded-xl border border-neutral-200 px-4 text-sm font-semibold"><option value="">Tüm kategoriler</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select><button className="h-12 rounded-xl bg-neutral-950 px-6 text-sm font-black text-white">Filtrele</button></form>
  <div className="mt-8 flex items-center justify-between"><p className="text-sm font-bold">{count} sonuç</p></div>{placements.length || organicListings.length ? <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{page === 1 ? placements.map(p => <PlacementListingCard key={p.id} listing={p.product} placementId={p.id} placementType={p.type} position={p.position} />) : null}{organicListings.map(l => <ListingCard key={l.id} listing={l} />)}</div> : <div className="mt-5 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Bu filtrelerle eşleşen ilan bulunamadı.</div>}
  {pages > 1 ? <nav className="mt-10 flex justify-center gap-2">{Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => <a key={p} href={`/ilanlar?${new URLSearchParams({ ...(query.ilce ? { ilce: query.ilce } : {}), ...(query.kategori ? { kategori: query.kategori } : {}), sayfa: String(p) })}`} className={`grid h-10 w-10 place-items-center rounded-full text-sm font-black ${p === page ? "bg-neutral-950 text-white" : "bg-white"}`}>{p}</a>)}</nav> : null}
  </main></PublicLayout>;
}
