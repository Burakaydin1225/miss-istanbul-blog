
import Link from "next/link";

import { ProductForm } from "@/app/panel/ilanlar/ProductForm";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { getProductPositionData } from "@/lib/product-position-data";
import prisma from "@/lib/prisma";

export default async function NewProductPage() {
  await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const [{ occupiedPositions, defaultSortOrders }, districts, neighborhoods, listingCategories] = await Promise.all([
    getProductPositionData(),
    prisma.district.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.neighborhood.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, districtId: true } }),
    prisma.listingCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
  ]);

  return (
    <section className="mx-auto max-w-4xl">
      <Link
        href="/panel/ilanlar"
        className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
      >
        ← İlanlara dön
      </Link>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        İlan yönetimi
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        Yeni ilan ekle
      </h1>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        İlan bilgilerini, konumunu, SEO ayarlarını ve yayın seçeneklerini belirleyin.
      </p>

      <ProductForm
        occupiedPositions={occupiedPositions}
        defaultSortOrders={defaultSortOrders}
        defaultSortOrder={defaultSortOrders.VIP}
        districts={districts}
        neighborhoods={neighborhoods}
        listingCategories={listingCategories}
      />
    </section>
  );
}
