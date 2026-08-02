import { notFound } from "next/navigation";

import { PlacementType } from "@/generated/prisma/client";
import { ListingCard } from "@/components/public/ListingCard";
import { PlacementListingCard } from "@/components/public/PlacementListingCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { activeListingWhere, listingInclude, listingOrderBy } from "@/lib/public-listings";
import { activePlacementWhere, placementInclude } from "@/lib/public-placements";

type Props = { params: Promise<{ slug: string }> };

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.listingCategory.findUnique({ where: { slug, isActive: true } });
  if (!category) notFound();

  const [placements, listings] = await Promise.all([
    prisma.placement.findMany({ where: activePlacementWhere(PlacementType.CATEGORY_TOP, { categoryId: category.id }), include: placementInclude, orderBy: [{ position: "asc" }, { createdAt: "asc" }], take: 8 }),
    prisma.product.findMany({ where: { ...activeListingWhere(), categoryId: category.id }, include: listingInclude, orderBy: listingOrderBy, take: 36 }),
  ]);
  const sponsoredIds = new Set(placements.map((item) => item.productId));
  const organicListings = listings.filter((item) => !sponsoredIds.has(item.id));

  return <PublicLayout><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
    <p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">Kategori</p>
    <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">{category.name}</h1>
    <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-500">{category.description || category.shortDescription || `${category.name} kategorisindeki güncel ilanları inceleyin.`}</p>
    {placements.length || organicListings.length ? <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {placements.map(p => <PlacementListingCard key={p.id} listing={p.product} placementId={p.id} placementType={p.type} position={p.position} />)}
      {organicListings.map(l => <ListingCard key={l.id} listing={l} />)}
    </div> : <div className="mt-9 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Bu kategoride henüz ilan bulunmuyor.</div>}
  </main></PublicLayout>;
}
