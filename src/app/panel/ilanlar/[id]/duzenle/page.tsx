import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductForm } from "@/app/panel/ilanlar/ProductForm";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { getProductPositionData } from "@/lib/product-position-data";
import prisma from "@/lib/prisma";

type EditProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: {
      id,
    },
    include: {
      images: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          imageUrl: true,
          altText: true,
        },
      },
      whatsappButtons: {
        orderBy: {
          sortOrder: "asc",
        },
        select: {
          id: true,
          label: true,
          phoneNumber: true,
          sortOrder: true,
          isActive: true,
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  /*
   * Düzenlenen ilanı dolu sıra listesinden çıkarıyoruz.
   * Böylece ürün kendi mevcut sırası için uyarı göstermez.
   */
  const [{ occupiedPositions, defaultSortOrders }, districts, neighborhoods, listingCategories] = await Promise.all([
    getProductPositionData(product.id),
    prisma.district.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
    prisma.neighborhood.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, districtId: true } }),
    prisma.listingCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true } }),
  ]);

  /*
   * Prisma Decimal değeri Client Component'e
   * doğrudan gönderilmemeli. Bu yüzden abonelik
   * ücretini string değerine dönüştürüyoruz.
   *
   * Ayrıca ProductForm'a yalnızca ihtiyaç duyduğu
   * alanları gönderiyoruz.
   */
  const productForForm = {
    id: product.id,
    name: product.name,
    shortDescription:
      product.shortDescription,
    description: product.description,
    detailTable: product.detailTable,
    coverImage: product.coverImage,
    coverImageAlt: product.coverImageAlt,
    cardTag: product.cardTag,
    region: product.region,
    whatsappNumber:
      product.whatsappNumber,
    whatsappButtons:
      product.whatsappButtons.map(
        (button) => ({
          id: button.id,
          label: button.label,
          phoneNumber:
            button.phoneNumber,
          sortOrder: button.sortOrder,
          isActive: button.isActive,
        }),
      ),
    category: product.category,
    sortOrder: product.sortOrder,
    subscriptionFee:
      product.subscriptionFee.toString(),
    isActive: product.isActive,
    districtId: product.districtId,
    neighborhoodId: product.neighborhoodId,
    categoryId: product.categoryId,
    status: product.status,
    priority: product.priority,
    publishedAt: product.publishedAt ? product.publishedAt.toISOString().slice(0, 16) : null,
    expiresAt: product.expiresAt ? product.expiresAt.toISOString().slice(0, 16) : null,
    featuredOnHome: product.featuredOnHome,
    featuredOnListings: product.featuredOnListings,
    featuredOnDistrict: product.featuredOnDistrict,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    canonicalUrl: product.canonicalUrl,
    noIndex: product.noIndex,
    images: product.images.map((image) => ({
      imageUrl: image.imageUrl,
      altText: image.altText,
    })),
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/panel/ilanlar"
          className="text-sm font-medium text-neutral-500 transition hover:text-neutral-950"
        >
          ← İlanlara dön
        </Link>

        <Link
          href={`/ilan/${product.slug}`}
          target="_blank"
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
        >
          İlanı görüntüle
        </Link>
      </div>

      <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        İlan yönetimi
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
        İlanı düzenle
      </h1>

      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {product.name}
      </p>

      <ProductForm
        product={productForForm}
        occupiedPositions={occupiedPositions}
        defaultSortOrders={defaultSortOrders}
        districts={districts}
        neighborhoods={neighborhoods}
        listingCategories={listingCategories}
      />
    </section>
  );
}
