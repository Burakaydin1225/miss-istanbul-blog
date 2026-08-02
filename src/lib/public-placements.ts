import type { PlacementType, Prisma } from "@/generated/prisma/client";
import { activeListingWhere, listingInclude } from "@/lib/public-listings";

export const placementInclude = {
  product: { include: listingInclude },
} satisfies Prisma.PlacementInclude;

export function activePlacementWhere(
  type: PlacementType | PlacementType[],
  options: { districtId?: string; categoryId?: string } = {},
  now = new Date(),
): Prisma.PlacementWhereInput {
  return {
    isActive: true,
    type: Array.isArray(type) ? { in: type } : type,
    startsAt: { lte: now },
    expiresAt: { gt: now },
    ...(options.districtId ? { districtId: options.districtId } : {}),
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    product: { is: activeListingWhere(now) },
  };
}
