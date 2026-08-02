import { AnalyticsEventType } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type PeriodOption = 7 | 30 | 90;

function resolvePeriod(value: string | null): PeriodOption {
  const parsed = Number.parseInt(value ?? "30", 10);
  return [7, 30, 90].includes(parsed) ? (parsed as PeriodOption) : 30;
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireUser();

  const url = new URL(request.url);
  const period = resolvePeriod(url.searchParams.get("period"));
  const startAt = new Date(Date.now() - (period - 1) * 24 * 60 * 60 * 1000);

  const [products, payments] = await Promise.all([
    prisma.product.findMany({
      where: {
        analyticsEvents: {
          some: {
            createdAt: { gte: startAt },
            eventType: {
              in: [
                AnalyticsEventType.PRODUCT_VIEW,
                AnalyticsEventType.WHATSAPP_CLICK,
              ],
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        district: { select: { name: true } },
        listingCategory: { select: { name: true } },
        analyticsEvents: {
          where: {
            createdAt: { gte: startAt },
            eventType: {
              in: [
                AnalyticsEventType.PRODUCT_VIEW,
                AnalyticsEventType.WHATSAPP_CLICK,
              ],
            },
          },
          select: { eventType: true },
        },
      },
    }),
    prisma.productPayment.findMany({
      where: { paidAt: { gte: startAt } },
      select: { productId: true, amount: true },
    }),
  ]);

  const revenueByProduct = new Map<string, number>();
  for (const payment of payments) {
    if (!payment.productId) continue;
    revenueByProduct.set(
      payment.productId,
      (revenueByProduct.get(payment.productId) ?? 0) + Number(payment.amount),
    );
  }

  const rows = [
    [
      "İlan",
      "Slug",
      "İlçe",
      "Kategori",
      "Görüntülenme",
      "WhatsApp",
      "Dönüşüm (%)",
      "Tahsilat (TL)",
    ],
    ...products
      .map((product) => {
        const views = product.analyticsEvents.filter(
          (event) => event.eventType === AnalyticsEventType.PRODUCT_VIEW,
        ).length;
        const clicks = product.analyticsEvents.filter(
          (event) => event.eventType === AnalyticsEventType.WHATSAPP_CLICK,
        ).length;
        return [
          product.name,
          product.slug,
          product.district?.name ?? "",
          product.listingCategory?.name ?? "",
          views,
          clicks,
          views > 0 ? ((clicks / views) * 100).toFixed(1) : "0",
          (revenueByProduct.get(product.id) ?? 0).toFixed(2),
        ];
      })
      .sort((a, b) => Number(b[4]) - Number(a[4])),
  ];

  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="miss-istanbul-istatistik-${period}-gun-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
