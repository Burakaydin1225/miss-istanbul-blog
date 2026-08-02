import Link from "next/link";

import { AnalyticsEventType, PlacementType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { calculateDistrictPricing } from "@/lib/dynamic-pricing";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ period?: string }>;
};

type PeriodOption = 7 | 30 | 90;
const periodOptions: PeriodOption[] = [7, 30, 90];

function resolvePeriod(value: string | undefined): PeriodOption {
  const parsed = Number.parseInt(value ?? "30", 10);
  return periodOptions.includes(parsed as PeriodOption)
    ? (parsed as PeriodOption)
    : 30;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value * 100);
}

const confidenceLabels = {
  LOW: "Düşük veri",
  MEDIUM: "Orta güven",
  HIGH: "Yüksek güven",
} as const;

export default async function PricingSuggestionsPage({ searchParams }: PageProps) {
  await requireUser();

  const params = await searchParams;
  const period = resolvePeriod(params.period);
  const now = new Date();
  const startAt = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

  const [districts, eventRows, activePlacements] = await Promise.all([
    prisma.district.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        products: {
          where: {
            isActive: true,
            status: "PUBLISHED",
            OR: [
              { subscriptionEndsAt: null },
              { subscriptionEndsAt: { gte: now } },
            ],
          },
          select: { id: true, subscriptionFee: true },
        },
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId", "eventType"],
      where: {
        productId: { not: null },
        createdAt: { gte: startAt },
        eventType: {
          in: [
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WHATSAPP_CLICK,
          ],
        },
      },
      _count: { _all: true },
    }),
    prisma.placement.findMany({
      where: {
        type: PlacementType.DISTRICT_TOP,
        isActive: true,
        startsAt: { lte: now },
        expiresAt: { gte: now },
        districtId: { not: null },
      },
      select: { districtId: true, position: true },
    }),
  ]);

  const productIds = Array.from(
    new Set(eventRows.map((row) => row.productId).filter((id): id is string => Boolean(id))),
  );
  const eventProducts = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, districtId: true },
      })
    : [];

  const productDistrictMap = new Map(
    eventProducts.map((product) => [product.id, product.districtId]),
  );
  const districtMetrics = new Map<string, { views: number; clicks: number }>();

  for (const row of eventRows) {
    if (!row.productId) continue;
    const districtId = productDistrictMap.get(row.productId);
    if (!districtId) continue;
    const current = districtMetrics.get(districtId) ?? { views: 0, clicks: 0 };
    if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      current.views += row._count._all;
    } else if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      current.clicks += row._count._all;
    }
    districtMetrics.set(districtId, current);
  }

  const placementStats = new Map<string, { active: number; capacity: number }>();
  for (const placement of activePlacements) {
    if (!placement.districtId) continue;
    const current = placementStats.get(placement.districtId) ?? { active: 0, capacity: 3 };
    current.active += 1;
    current.capacity = Math.max(current.capacity, placement.position, 3);
    placementStats.set(placement.districtId, current);
  }

  const suggestions = calculateDistrictPricing(
    districts.map((district) => {
      const metrics = districtMetrics.get(district.id) ?? { views: 0, clicks: 0 };
      const placement = placementStats.get(district.id) ?? { active: 0, capacity: 3 };
      const paidFees = district.products
        .map((product) => Number(product.subscriptionFee))
        .filter((fee) => fee > 0);
      const averageMonthlyFee = paidFees.length
        ? paidFees.reduce((sum, fee) => sum + fee, 0) / paidFees.length
        : 0;

      return {
        districtId: district.id,
        districtName: district.name,
        views: metrics.views,
        clicks: metrics.clicks,
        activeListings: district.products.length,
        activeTopPlacements: placement.active,
        topPlacementCapacity: placement.capacity,
        averageMonthlyFee,
      };
    }),
  );

  const dataBackedSuggestions = suggestions.filter((row) => row.views > 0 || row.activeListings > 0);
  const averageSuggestedPrice = dataBackedSuggestions.length
    ? dataBackedSuggestions.reduce((sum, row) => sum + row.suggestedStandardPrice, 0) /
      dataBackedSuggestions.length
    : 0;
  const highDemandCount = suggestions.filter((row) => row.demandScore >= 65).length;
  const emptyTopSlotCount = suggestions.reduce(
    (sum, row) => sum + Math.max(0, row.topPlacementCapacity - row.activeTopPlacements),
    0,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Gelir optimizasyonu
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            Dinamik fiyat önerileri
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
            İlçe trafiği, WhatsApp dönüşümü, aktif ilan sayısı, mevcut ücretler ve üst reklam alanı doluluğuna göre aylık teklif aralıkları üretir. Öneriler otomatik fiyat uygulamaz; son teklif kararı sende kalır.
          </p>
        </div>

        <div className="flex rounded-2xl border border-neutral-200 bg-white p-1">
          {periodOptions.map((option) => (
            <Link
              key={option}
              href={`/panel/fiyat-onerileri?period=${option}`}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                period === option
                  ? "bg-neutral-950 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {option} gün
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Ortalama standart öneri", formatMoney(averageSuggestedPrice)],
          ["Yüksek talep ilçesi", formatNumber(highDemandCount)],
          ["Boş üst reklam alanı", formatNumber(emptyTopSlotCount)],
          ["Analiz edilen ilçe", formatNumber(suggestions.length)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">İlçe bazlı teklif tablosu</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Standart yayın, ilçe üst sırası ve VIP görünürlük için aylık öneriler
            </p>
          </div>
          <Link href="/panel/reklam-konumlari" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">
            Reklam konumlarını yönet →
          </Link>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-[0.08em] text-neutral-500">
                <th className="px-3 py-3">İlçe</th>
                <th className="px-3 py-3">Talep</th>
                <th className="px-3 py-3">Trafik / WhatsApp</th>
                <th className="px-3 py-3">Doluluk</th>
                <th className="px-3 py-3">Mevcut ortalama</th>
                <th className="px-3 py-3">Standart</th>
                <th className="px-3 py-3">Üst sıra</th>
                <th className="px-3 py-3">VIP paket</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((row) => (
                <tr key={row.districtId} className="border-b border-neutral-100 align-top last:border-0">
                  <td className="px-3 py-4">
                    <p className="font-semibold text-neutral-950">{row.districtName}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {row.activeListings} aktif ilan · {confidenceLabels[row.confidence]}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {row.reasons.slice(0, 2).map((reason) => (
                        <span key={reason} className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
                          {reason}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      row.demandScore >= 65
                        ? "bg-emerald-50 text-emerald-700"
                        : row.demandScore >= 35
                          ? "bg-amber-50 text-amber-700"
                          : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {row.demandScore}/100
                    </span>
                  </td>
                  <td className="px-3 py-4 text-neutral-700">
                    <p className="font-semibold text-neutral-950">{formatNumber(row.views)} görüntülenme</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatNumber(row.clicks)} tıklama · %{formatPercent(row.conversionRate)} dönüşüm
                    </p>
                  </td>
                  <td className="px-3 py-4 text-neutral-700">
                    <p className="font-semibold text-neutral-950">
                      {row.activeTopPlacements}/{row.topPlacementCapacity}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">%{formatPercent(row.occupancyRate)} dolu</p>
                  </td>
                  <td className="px-3 py-4 font-semibold text-neutral-700">
                    {row.averageMonthlyFee > 0 ? formatMoney(row.averageMonthlyFee) : "Veri yok"}
                  </td>
                  <td className="px-3 py-4 font-bold text-neutral-950">{formatMoney(row.suggestedStandardPrice)}</td>
                  <td className="px-3 py-4 font-bold text-neutral-950">{formatMoney(row.suggestedTopPrice)}</td>
                  <td className="px-3 py-4 font-bold text-neutral-950">{formatMoney(row.suggestedVipPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-950">Standart yayın</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            İlçe sayfasındaki normal görünürlük ve ilan detay yayını için önerilen aylık taban bedeldir.
          </p>
        </article>
        <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-950">İlçe üst sırası</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            İlçe sayfasındaki sınırlı üst reklam alanlarının doluluk ve talep primini içerir.
          </p>
        </article>
        <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-neutral-950">VIP paket</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Standart yayın ile üst görünürlüğün birlikte satıldığı yüksek değerli teklif referansıdır.
          </p>
        </article>
      </section>
    </div>
  );
}
