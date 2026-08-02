import Link from "next/link";

import { AnalyticsEventType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type StatisticsPageProps = {
  searchParams: Promise<{
    period?: string;
  }>;
};

type PeriodOption = 7 | 30 | 90;

type DailyTrendRow = {
  day: Date;
  eventType: string;
  eventCount: number;
};

type AggregatePerformance = {
  id: string;
  name: string;
  views: number;
  clicks: number;
};

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

function formatPercent(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function startOfLocalDay(date: Date): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000);
}

function getSourceLabel(source: string | null): string {
  if (!source || source === "direct") return "Doğrudan";
  if (source === "internal") return "Site içi";
  if (source.includes("google")) return "Google";
  if (source.includes("yandex")) return "Yandex";
  if (source.includes("bing")) return "Bing";
  if (source.includes("instagram")) return "Instagram";
  if (source.includes("facebook")) return "Facebook";
  return source;
}

function getDeviceLabel(device: string | null): string {
  if (device === "mobile") return "Mobil";
  if (device === "tablet") return "Tablet";
  return "Masaüstü";
}

function percentage(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0;
}

export default async function StatisticsPage({
  searchParams,
}: StatisticsPageProps) {
  await requireUser();

  const params = await searchParams;
  const period = resolvePeriod(params.period);
  const now = new Date();
  const startAt = startOfLocalDay(
    new Date(now.getTime() - (period - 1) * 24 * 60 * 60 * 1000),
  );

  const [
    pageViews,
    listingViews,
    whatsappClicks,
    uniqueVisitors,
    sourceRows,
    deviceRows,
    pathRows,
    listingRows,
    activeVisitors,
    dailyTrendRows,
    placements,
    placementEventRows,
    paymentRows,
    activeRevenueRows,
    expiringListings,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: { gte: startAt },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.PRODUCT_VIEW,
        createdAt: { gte: startAt },
      },
    }),
    prisma.analyticsEvent.count({
      where: {
        eventType: AnalyticsEventType.WHATSAPP_CLICK,
        createdAt: { gte: startAt },
      },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: { gte: startAt },
      },
      distinct: ["visitorHash"],
      select: { visitorHash: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["source"],
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: { gte: startAt },
      },
      _count: { _all: true },
      orderBy: { _count: { source: "desc" } },
      take: 8,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["deviceType"],
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: { gte: startAt },
      },
      _count: { _all: true },
      orderBy: { _count: { deviceType: "desc" } },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["path"],
      where: {
        eventType: AnalyticsEventType.PAGE_VIEW,
        createdAt: { gte: startAt },
      },
      _count: { _all: true },
      orderBy: { _count: { path: "desc" } },
      take: 10,
    }),
    prisma.analyticsEvent.groupBy({
      by: ["productId", "eventType"],
      where: {
        productId: { not: null },
        eventType: {
          in: [
            AnalyticsEventType.PRODUCT_VIEW,
            AnalyticsEventType.WHATSAPP_CLICK,
          ],
        },
        createdAt: { gte: startAt },
      },
      _count: { _all: true },
    }),
    prisma.activeSession.findMany({
      where: {
        lastSeenAt: {
          gte: new Date(now.getTime() - 2 * 60 * 1000),
        },
      },
      distinct: ["visitorHash"],
      select: { visitorHash: true },
    }),
    prisma.$queryRaw<DailyTrendRow[]>`
      SELECT
        date_trunc(
          'day',
          "createdAt" AT TIME ZONE 'Europe/Istanbul'
        ) AS "day",
        "eventType"::text AS "eventType",
        COUNT(*)::int AS "eventCount"
      FROM "AnalyticsEvent"
      WHERE
        "createdAt" >= ${startAt}
        AND "eventType" IN (
          'PAGE_VIEW'::"AnalyticsEventType",
          'PRODUCT_VIEW'::"AnalyticsEventType",
          'WHATSAPP_CLICK'::"AnalyticsEventType"
        )
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `,
    prisma.placement.findMany({
      where: {
        startsAt: { lte: now },
        expiresAt: { gte: startAt },
      },
      orderBy: [{ isActive: "desc" }, { position: "asc" }],
      include: {
        product: { select: { id: true, name: true } },
        district: { select: { name: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["placementId", "eventType"],
      where: {
        placementId: { not: null },
        eventType: {
          in: [
            AnalyticsEventType.PLACEMENT_IMPRESSION,
            AnalyticsEventType.PLACEMENT_CLICK,
          ],
        },
        createdAt: { gte: startAt },
      },
      _count: { _all: true },
    }),
    prisma.productPayment.findMany({
      where: { paidAt: { gte: startAt } },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        productId: true,
        productName: true,
        amount: true,
        paidAt: true,
        periodStart: true,
        periodEnd: true,
      },
    }),
    prisma.product.findMany({
      where: {
        isActive: true,
        status: "PUBLISHED",
        OR: [
          { subscriptionEndsAt: null },
          { subscriptionEndsAt: { gte: now } },
        ],
      },
      select: { subscriptionFee: true },
    }),
    prisma.product.count({
      where: {
        isActive: true,
        status: "PUBLISHED",
        subscriptionEndsAt: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  const listingIds = Array.from(
    new Set(
      listingRows
        .map((row) => row.productId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const listings = listingIds.length
    ? await prisma.product.findMany({
        where: { id: { in: listingIds } },
        select: {
          id: true,
          name: true,
          slug: true,
          district: { select: { id: true, name: true } },
          listingCategory: { select: { id: true, name: true } },
        },
      })
    : [];

  const listingMap = new Map(
    listings.map((listing) => [listing.id, listing]),
  );

  const listingPerformance = new Map<
    string,
    { views: number; clicks: number }
  >();

  for (const row of listingRows) {
    if (!row.productId) continue;
    const current = listingPerformance.get(row.productId) ?? {
      views: 0,
      clicks: 0,
    };

    if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      current.views += row._count._all;
    } else if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      current.clicks += row._count._all;
    }

    listingPerformance.set(row.productId, current);
  }

  const topListings = Array.from(listingPerformance.entries())
    .map(([id, metrics]) => ({
      id,
      listing: listingMap.get(id),
      ...metrics,
    }))
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks)
    .slice(0, 10);

  function aggregateListingDimension(
    dimension: "district" | "category",
  ): AggregatePerformance[] {
    const rows = new Map<string, AggregatePerformance>();

    for (const [listingId, metrics] of listingPerformance.entries()) {
      const listing = listingMap.get(listingId);
      const entity =
        dimension === "district"
          ? listing?.district
          : listing?.listingCategory;

      if (!entity) continue;

      const current = rows.get(entity.id) ?? {
        id: entity.id,
        name: entity.name,
        views: 0,
        clicks: 0,
      };

      current.views += metrics.views;
      current.clicks += metrics.clicks;
      rows.set(entity.id, current);
    }

    return Array.from(rows.values())
      .sort((a, b) => b.views - a.views || b.clicks - a.clicks)
      .slice(0, 10);
  }

  const districtPerformance = aggregateListingDimension("district");
  const categoryPerformance = aggregateListingDimension("category");

  const dateKeys: string[] = [];
  for (let index = 0; index < period; index += 1) {
    const date = new Date(startAt.getTime() + index * 24 * 60 * 60 * 1000);
    dateKeys.push(date.toISOString().slice(0, 10));
  }

  const dailyMap = new Map(
    dateKeys.map((date) => [
      date,
      { date, pageViews: 0, listingViews: 0, clicks: 0 },
    ]),
  );

  for (const row of dailyTrendRows) {
    const key = new Date(row.day).toISOString().slice(0, 10);
    const current = dailyMap.get(key);
    if (!current) continue;

    if (row.eventType === AnalyticsEventType.PAGE_VIEW) {
      current.pageViews += row.eventCount;
    } else if (row.eventType === AnalyticsEventType.PRODUCT_VIEW) {
      current.listingViews += row.eventCount;
    } else if (row.eventType === AnalyticsEventType.WHATSAPP_CLICK) {
      current.clicks += row.eventCount;
    }
  }

  const dailyTrend = Array.from(dailyMap.values());
  const maximumDailyValue = Math.max(
    1,
    ...dailyTrend.flatMap((row) => [row.pageViews, row.listingViews, row.clicks]),
  );

  const placementMetrics = new Map<string, { impressions: number; clicks: number }>();
  for (const row of placementEventRows) {
    if (!row.placementId) continue;
    const current = placementMetrics.get(row.placementId) ?? { impressions: 0, clicks: 0 };
    if (row.eventType === AnalyticsEventType.PLACEMENT_IMPRESSION) {
      current.impressions += row._count._all;
    } else if (row.eventType === AnalyticsEventType.PLACEMENT_CLICK) {
      current.clicks += row._count._all;
    }
    placementMetrics.set(row.placementId, current);
  }

  const placementPerformance = placements
    .map((placement) => {
      const metrics = placementMetrics.get(placement.id) ?? {
        impressions: 0,
        clicks: 0,
      };
      return { ...placement, ...metrics };
    })
    .sort((a, b) => b.impressions - a.impressions || b.clicks - a.clicks)
    .slice(0, 20);

  const placementImpressions = placementPerformance.reduce((sum, row) => sum + row.impressions, 0);
  const placementClicks = placementPerformance.reduce((sum, row) => sum + row.clicks, 0);

  const collectedRevenue = paymentRows.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );
  const activeMonthlyRevenue = activeRevenueRows.reduce(
    (sum, listing) => sum + Number(listing.subscriptionFee),
    0,
  );
  const revenuePerWhatsapp = whatsappClicks > 0
    ? collectedRevenue / whatsappClicks
    : 0;
  const paidListingCount = new Set(
    paymentRows.map((payment) => payment.productId ?? payment.productName),
  ).size;

  const conversionRate = percentage(whatsappClicks, listingViews);
  const pagesPerVisitor = uniqueVisitors.length
    ? pageViews / uniqueVisitors.length
    : 0;
  const maximumPathViews = Math.max(
    1,
    ...pathRows.map((row) => row._count._all),
  );
  const maximumListingViews = Math.max(
    1,
    ...topListings.map((row) => row.views),
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
            Performans merkezi
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-950">
            İstatistikler
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Trafik kaynaklarını, ilan görüntülenmelerini ve WhatsApp dönüşümlerini tek ekrandan takip et.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/panel/istatistikler/disa-aktar?period=${period}`}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
          >
            CSV dışa aktar
          </Link>
          <div className="flex rounded-2xl border border-neutral-200 bg-white p-1">
          {periodOptions.map((option) => (
            <Link
              key={option}
              href={`/panel/istatistikler?period=${option}`}
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
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Sayfa görüntülenmesi", formatNumber(pageViews)],
          ["Tekil ziyaretçi", formatNumber(uniqueVisitors.length)],
          ["İlan görüntülenmesi", formatNumber(listingViews)],
          ["WhatsApp tıklaması", formatNumber(whatsappClicks)],
          ["Dönüşüm", `%${formatPercent(conversionRate)}`],
          ["Şu an aktif", formatNumber(activeVisitors.length)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Tahsil edilen gelir", formatMoney(collectedRevenue), `${period} günlük ödeme kaydı`],
          ["Aktif aylık değer", formatMoney(activeMonthlyRevenue), "Aktif ilanların aylık ücret toplamı"],
          ["Ödeme yapan ilan", formatNumber(paidListingCount), "Seçilen dönemde"],
          ["WhatsApp başına gelir", formatMoney(revenuePerWhatsapp), "Tahsilat / WhatsApp tıklaması"],
          ["7 gün içinde bitecek", formatNumber(expiringListings), "Yenileme takibi gereken ilan"],
        ].map(([label, value, description]) => (
          <article key={label} className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-neutral-500">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-neutral-950">{value}</p>
            <p className="mt-2 text-xs leading-5 text-neutral-500">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-950">En çok ziyaret edilen sayfalar</h2>
              <p className="mt-1 text-sm text-neutral-500">Seçilen dönemdeki public sayfa görüntülenmeleri</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {pagesPerVisitor.toFixed(1)} sayfa / ziyaretçi
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {pathRows.length ? pathRows.map((row) => (
              <div key={row.path}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate font-medium text-neutral-800">{row.path}</span>
                  <span className="shrink-0 font-semibold text-neutral-950">{formatNumber(row._count._all)}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-900"
                    style={{ width: `${percentage(row._count._all, maximumPathViews)}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">Bu dönem için sayfa verisi bulunmuyor.</p>
            )}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">Trafik kaynakları</h2>
            <div className="mt-5 space-y-3">
              {sourceRows.length ? sourceRows.map((row) => (
                <div key={row.source ?? "direct"} className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50 px-4 py-3">
                  <span className="truncate text-sm font-medium text-neutral-700">{getSourceLabel(row.source)}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-950">{formatNumber(row._count._all)}</p>
                    <p className="text-[11px] text-neutral-500">%{formatPercent(percentage(row._count._all, pageViews))}</p>
                  </div>
                </div>
              )) : <p className="text-sm text-neutral-500">Kaynak verisi bulunmuyor.</p>}
            </div>
          </article>

          <article className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-neutral-950">Cihaz dağılımı</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {deviceRows.map((row) => (
                <div key={row.deviceType ?? "desktop"} className="rounded-2xl bg-neutral-50 p-4">
                  <p className="text-xs font-medium text-neutral-500">{getDeviceLabel(row.deviceType)}</p>
                  <p className="mt-2 text-xl font-semibold text-neutral-950">%{formatPercent(percentage(row._count._all, pageViews))}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Günlük performans eğilimi</h2>
            <p className="mt-1 text-sm text-neutral-500">Sayfa, ilan ve WhatsApp hareketlerinin günlere göre dağılımı</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs font-semibold text-neutral-600">
            <span>● Sayfa</span><span>● İlan</span><span>● WhatsApp</span>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto pb-2">
          <div className="flex min-w-[720px] items-end gap-2" style={{ height: 230 }}>
            {dailyTrend.map((row) => (
              <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div className="flex h-44 w-full items-end justify-center gap-1 rounded-xl bg-neutral-50 px-1.5 pt-3">
                  <div title={`Sayfa: ${row.pageViews}`} className="w-2.5 rounded-t bg-neutral-900" style={{ height: `${Math.max(2, percentage(row.pageViews, maximumDailyValue))}%` }} />
                  <div title={`İlan: ${row.listingViews}`} className="w-2.5 rounded-t bg-neutral-500" style={{ height: `${Math.max(2, percentage(row.listingViews, maximumDailyValue))}%` }} />
                  <div title={`WhatsApp: ${row.clicks}`} className="w-2.5 rounded-t bg-emerald-500" style={{ height: `${Math.max(2, percentage(row.clicks, maximumDailyValue))}%` }} />
                </div>
                <span className="text-[10px] text-neutral-500">{row.date.slice(5).split("-").reverse().join(".")}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {[
          { title: "İlçe performansı", description: "İlan görüntülenmelerinin ilçelere göre toplamı", rows: districtPerformance },
          { title: "Kategori performansı", description: "Kategori bazında görüntülenme ve iletişim dönüşümü", rows: categoryPerformance },
        ].map((group) => {
          const maximum = Math.max(1, ...group.rows.map((row) => row.views));
          return (
            <article key={group.title} className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-neutral-950">{group.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">{group.description}</p>
              <div className="mt-6 space-y-4">
                {group.rows.length ? group.rows.map((row) => (
                  <div key={row.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-neutral-800">{row.name}</span>
                      <span className="shrink-0 text-xs text-neutral-500">{formatNumber(row.views)} görüntülenme · {formatNumber(row.clicks)} tıklama · %{formatPercent(percentage(row.clicks, row.views))}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900" style={{ width: `${percentage(row.views, maximum)}%` }} /></div>
                  </div>
                )) : <p className="rounded-2xl bg-neutral-50 p-5 text-sm text-neutral-500">Bu dönem için yeterli veri bulunmuyor.</p>}
              </div>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Reklam konumu performansı</h2>
            <p className="mt-1 text-sm text-neutral-500">Her reklam alanının gerçek gösterim, tıklama ve CTR sonuçları</p>
          </div>
          <Link href="/panel/reklam-konumlari" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">Konumları yönet →</Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Reklam gösterimi</p><p className="mt-2 text-xl font-semibold">{formatNumber(placementImpressions)}</p></div><div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Reklam tıklaması</p><p className="mt-2 text-xl font-semibold">{formatNumber(placementClicks)}</p></div><div className="rounded-2xl bg-neutral-50 p-4"><p className="text-xs text-neutral-500">Genel CTR</p><p className="mt-2 text-xl font-semibold">%{formatPercent(percentage(placementClicks, placementImpressions))}</p></div></div>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-[0.08em] text-neutral-500"><th className="px-3 py-3">İlan</th><th className="px-3 py-3">Yerleşim</th><th className="px-3 py-3">Kapsam</th><th className="px-3 py-3">Gösterim</th><th className="px-3 py-3">Tıklama</th><th className="px-3 py-3">CTR</th></tr></thead>
            <tbody>{placementPerformance.length ? placementPerformance.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-4 font-semibold text-neutral-950">{row.product.name}</td>
                <td className="px-3 py-4 text-neutral-700">{row.type.replaceAll("_", " ")}</td>
                <td className="px-3 py-4 text-neutral-600">{[row.district?.name, row.category?.name].filter(Boolean).join(" · ") || "Genel"}</td>
                <td className="px-3 py-4 font-semibold">{formatNumber(row.impressions)}</td>
                <td className="px-3 py-4 font-semibold">{formatNumber(row.clicks)}</td>
                <td className="px-3 py-4"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">%{formatPercent(percentage(row.clicks, row.impressions))}</span></td>
              </tr>
            )) : <tr><td colSpan={6} className="px-3 py-10 text-center text-neutral-500">Bu dönemle çakışan reklam konumu bulunmuyor.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">Gelir ve yenileme hareketleri</h2>
            <p className="mt-1 text-sm text-neutral-500">Seçilen dönemde kaydedilen son tahsilatlar</p>
          </div>
          <Link href="/panel/ilanlar" className="text-sm font-semibold text-neutral-700 hover:text-neutral-950">İlanları yönet →</Link>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead><tr className="border-b border-neutral-200 text-xs uppercase tracking-[0.08em] text-neutral-500"><th className="px-3 py-3">İlan</th><th className="px-3 py-3">Tutar</th><th className="px-3 py-3">Ödeme tarihi</th><th className="px-3 py-3">Yayın dönemi</th></tr></thead>
            <tbody>{paymentRows.length ? paymentRows.slice(0, 12).map((payment) => (
              <tr key={payment.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-3 py-4 font-semibold text-neutral-950">{payment.productId ? <Link className="hover:underline" href={`/panel/ilanlar/${payment.productId}`}>{payment.productName}</Link> : payment.productName}</td>
                <td className="px-3 py-4 font-semibold text-neutral-950">{formatMoney(Number(payment.amount))}</td>
                <td className="px-3 py-4 text-neutral-600">{formatDate(payment.paidAt)}</td>
                <td className="px-3 py-4 text-neutral-600">{formatDate(payment.periodStart)} – {formatDate(payment.periodEnd)}</td>
              </tr>
            )) : <tr><td colSpan={4} className="px-3 py-10 text-center text-neutral-500">Bu dönem için ödeme kaydı bulunmuyor.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-950">İlan performansı</h2>
            <p className="mt-1 text-sm text-neutral-500">Görüntülenme ve iletişim dönüşümlerine göre ilk 10 ilan</p>
          </div>
          <p className="text-xs text-neutral-500">{formatDate(startAt)} – {formatDate(now)}</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-[0.08em] text-neutral-500">
                <th className="px-3 py-3 font-semibold">İlan</th>
                <th className="px-3 py-3 font-semibold">Konum</th>
                <th className="px-3 py-3 font-semibold">Görüntülenme</th>
                <th className="px-3 py-3 font-semibold">WhatsApp</th>
                <th className="px-3 py-3 font-semibold">Dönüşüm</th>
              </tr>
            </thead>
            <tbody>
              {topListings.length ? topListings.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-4">
                    <div className="min-w-[230px]">
                      <Link href={`/panel/ilanlar/${row.id}`} className="font-semibold text-neutral-950 hover:underline">
                        {row.listing?.name ?? "Silinmiş ilan"}
                      </Link>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <div className="h-full rounded-full bg-neutral-900" style={{ width: `${percentage(row.views, maximumListingViews)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 text-neutral-600">
                    {[row.listing?.district?.name, row.listing?.listingCategory?.name].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-4 font-semibold text-neutral-950">{formatNumber(row.views)}</td>
                  <td className="px-3 py-4 font-semibold text-neutral-950">{formatNumber(row.clicks)}</td>
                  <td className="px-3 py-4">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      %{formatPercent(percentage(row.clicks, row.views))}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-neutral-500">Bu dönem için ilan performans verisi bulunmuyor.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
