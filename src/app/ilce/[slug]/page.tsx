import Link from "next/link";
import { notFound } from "next/navigation";

import { PlacementType } from "@/generated/prisma/client";
import { ListingCard } from "@/components/public/ListingCard";
import { PlacementListingCard } from "@/components/public/PlacementListingCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import { SectionHeading } from "@/components/public/SectionHeading";
import prisma from "@/lib/prisma";
import { activeListingWhere, listingInclude, listingOrderBy } from "@/lib/public-listings";
import { activePlacementWhere, placementInclude } from "@/lib/public-placements";

type Props = { params: Promise<{ slug: string }> };

export default async function DistrictPage({ params }: Props) {
  const { slug } = await params;
  const district = await prisma.district.findUnique({
    where: { slug, isActive: true },
    include: { neighborhoods: { where: { isActive: true }, orderBy: { name: "asc" } } },
  });
  if (!district) notFound();

  const [placements, listings] = await Promise.all([
    prisma.placement.findMany({
      where: activePlacementWhere(PlacementType.DISTRICT_TOP, { districtId: district.id }),
      include: placementInclude,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      take: 8,
    }),
    prisma.product.findMany({
      where: { ...activeListingWhere(), districtId: district.id },
      include: listingInclude,
      orderBy: [{ featuredOnDistrict: "desc" }, ...listingOrderBy],
      take: 32,
    }),
  ]);
  const sponsoredIds = new Set(placements.map((item) => item.productId));
  const organicListings = listings.filter((item) => !sponsoredIds.has(item.id));

  return <PublicLayout><main>
    <section className="bg-neutral-950 text-white"><div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">İstanbul / İlçe</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.055em] sm:text-6xl">{district.name} ilanları</h1>
      <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-300">{district.description || district.shortDescription || `${district.name} bölgesindeki güncel ve öne çıkan ilanları tek sayfada inceleyin.`}</p>
      {district.neighborhoods.length ? <div className="mt-7 flex flex-wrap gap-2">{district.neighborhoods.slice(0, 12).map(n => <span key={n.id} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-neutral-300">{n.name}</span>)}</div> : null}
    </div></section>
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <SectionHeading eyebrow="Yerel vitrin" title={`${district.name} bölgesindeki ilanlar`} description={`${placements.length + organicListings.length} aktif sonuç gösteriliyor.`} />
      {placements.length || organicListings.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {placements.map(p => <PlacementListingCard key={p.id} listing={p.product} placementId={p.id} placementType={p.type} position={p.position} />)}
        {organicListings.map(l => <ListingCard key={l.id} listing={l} />)}
      </div> : <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Bu ilçede henüz yayınlanmış ilan bulunmuyor.</div>}
      <div className="mt-12 rounded-3xl border border-neutral-200 bg-white p-7"><h2 className="text-xl font-black">Diğer bölgeleri keşfet</h2><Link href="/ilceler" className="mt-4 inline-flex text-sm font-black text-fuchsia-600 underline underline-offset-4">Tüm İstanbul ilçeleri</Link></div>
    </section>
  </main></PublicLayout>;
}
