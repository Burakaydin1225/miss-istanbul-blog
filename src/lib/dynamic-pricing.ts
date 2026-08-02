export type DistrictPricingInput = {
  districtId: string;
  districtName: string;
  views: number;
  clicks: number;
  activeListings: number;
  activeTopPlacements: number;
  topPlacementCapacity: number;
  averageMonthlyFee: number;
};

export type DistrictPricingSuggestion = DistrictPricingInput & {
  conversionRate: number;
  occupancyRate: number;
  demandScore: number;
  suggestedStandardPrice: number;
  suggestedTopPrice: number;
  suggestedVipPrice: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTo(value: number, step = 250): number {
  return Math.round(value / step) * step;
}

export function calculateDistrictPricing(
  rows: DistrictPricingInput[],
): DistrictPricingSuggestion[] {
  const maximumViews = Math.max(1, ...rows.map((row) => row.views));
  const totalViews = rows.reduce((sum, row) => sum + row.views, 0);
  const totalClicks = rows.reduce((sum, row) => sum + row.clicks, 0);
  const siteConversionRate = totalViews > 0 ? totalClicks / totalViews : 0;

  return rows
    .map((row) => {
      const conversionRate = row.views > 0 ? row.clicks / row.views : 0;
      const occupancyRate = row.topPlacementCapacity > 0
        ? clamp(row.activeTopPlacements / row.topPlacementCapacity, 0, 1)
        : 0;

      const trafficFactor = 0.8 + 1.2 * Math.sqrt(row.views / maximumViews);
      const conversionFactor = siteConversionRate > 0
        ? clamp(0.9 + (conversionRate / siteConversionRate) * 0.25, 0.85, 1.4)
        : 1;
      const occupancyFactor = 1 + occupancyRate * 0.5;
      const listingFactor = 1 + clamp(Math.log10(row.activeListings + 1) * 0.12, 0, 0.3);
      const demandScore = clamp(
        Math.round(
          35 * (row.views / maximumViews) +
          25 * clamp(siteConversionRate > 0 ? conversionRate / siteConversionRate : 0, 0, 1) +
          25 * occupancyRate +
          15 * clamp(row.activeListings / 20, 0, 1),
        ),
        0,
        100,
      );

      const anchorPrice = row.averageMonthlyFee > 0
        ? clamp(row.averageMonthlyFee, 750, 15000)
        : 1500;

      const standard = clamp(
        roundTo(anchorPrice * trafficFactor * conversionFactor * occupancyFactor * listingFactor),
        750,
        25000,
      );

      const reasons: string[] = [];
      if (row.views === 0) reasons.push("Henüz trafik verisi yok");
      else if (row.views / maximumViews >= 0.7) reasons.push("Yüksek ilçe trafiği");
      else if (row.views / maximumViews >= 0.35) reasons.push("Orta seviye ilçe trafiği");
      else reasons.push("Gelişmekte olan ilçe trafiği");

      if (occupancyRate >= 0.67) reasons.push("Üst reklam alanlarında yüksek doluluk");
      else if (occupancyRate > 0) reasons.push("Üst reklam alanlarında kısmi doluluk");
      else reasons.push("Üst reklam alanları boş");

      if (siteConversionRate > 0 && conversionRate >= siteConversionRate * 1.15) {
        reasons.push("Site ortalamasının üzerinde dönüşüm");
      } else if (row.clicks > 0) {
        reasons.push("Ölçülebilir WhatsApp talebi");
      }

      const confidence: DistrictPricingSuggestion["confidence"] =
        row.views >= 500 && row.clicks >= 10
        ? "HIGH"
        : row.views >= 100 || row.clicks >= 3
          ? "MEDIUM"
          : "LOW";

      return {
        ...row,
        conversionRate,
        occupancyRate,
        demandScore,
        suggestedStandardPrice: standard,
        suggestedTopPrice: clamp(roundTo(standard * 1.45), 1000, 35000),
        suggestedVipPrice: clamp(roundTo(standard * 1.9), 1500, 50000),
        confidence,
        reasons,
      };
    })
    .sort((a, b) => b.demandScore - a.demandScore || b.views - a.views);
}
