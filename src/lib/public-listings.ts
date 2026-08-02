import type { Prisma } from "@/generated/prisma/client";

export const listingInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  whatsappButtons: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" as const },
  },
  district: true,
  neighborhood: true,
  listingCategory: true,
} satisfies Prisma.ProductInclude;

export type PublicListing = Prisma.ProductGetPayload<{
  include: typeof listingInclude;
}>;

export function activeListingWhere(now = new Date()): Prisma.ProductWhereInput {
  return {
    isActive: true,
    status: "PUBLISHED",
    noIndex: false,
    AND: [
      { OR: [{ publishedAt: null }, { publishedAt: { lte: now } }] },
      { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      {
        OR: [
          { subscriptionEndsAt: null },
          { subscriptionEndsAt: { gt: now } },
        ],
      },
    ],
  };
}

export const listingOrderBy: Prisma.ProductOrderByWithRelationInput[] = [
  { featuredOnListings: "desc" },
  { featuredOnHome: "desc" },
  { priority: "desc" },
  { category: "asc" },
  { sortOrder: "asc" },
  { createdAt: "desc" },
];

export function listingLocation(listing: PublicListing): string {
  return [listing.neighborhood?.name, listing.district?.name ?? listing.region]
    .filter(Boolean)
    .join(", ");
}
