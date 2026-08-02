import { productRegions } from "./product-regions";

const DEFAULT_SITE_URL = "https://missistanbul.com";
const DEFAULT_WHATSAPP = "905344385541";

function normalizeSiteUrl(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return DEFAULT_SITE_URL;
  }

  const withProtocol =
    trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")
      ? trimmedValue
      : `https://${trimmedValue}`;

  try {
    const parsedUrl = new URL(withProtocol);

    if (
      parsedUrl.hostname !== "localhost" &&
      parsedUrl.hostname !== "127.0.0.1"
    ) {
      parsedUrl.protocol = "https:";
    }

    parsedUrl.pathname = "";
    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString().replace(/\/+$/, "");
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return DEFAULT_WHATSAPP;
  }

  if (digits.startsWith("0")) {
    return `90${digits.slice(1)}`;
  }

  return digits;
}

const resolvedSiteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL,
);

const resolvedUrl = new URL(resolvedSiteUrl);

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "Miss İstanbul",
  shortName:
    process.env.NEXT_PUBLIC_SITE_SHORT_NAME?.trim() || "Miss İstanbul",
  url: resolvedSiteUrl,
  hostname: resolvedUrl.hostname,
  canonicalHost: resolvedUrl.host,
  locale: "tr_TR",
  language: "tr-TR",

  homeTitle: "İstanbul Blog ve Şehir Rehberi | Miss İstanbul",
  homeHeading: "İstanbul Blog",
  description:
    "İstanbul hakkında güncel yazıları, şehir rehberlerini ve bölgesel içerikleri Miss İstanbul'da keşfedin.",
  homeIntro:
    "İstanbul yaşamı, şehir kültürü, bölgesel notlar ve güncel rehber içeriklerini tek noktadan okuyun.",

  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  contactWhatsapp: normalizeWhatsapp(
    process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? DEFAULT_WHATSAPP,
  ),

  social: {
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "",
    x: process.env.NEXT_PUBLIC_X_URL?.trim() || "",
  },
} as const;

export function absoluteUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${siteConfig.url}${normalizedPath}`;
}

export function whatsappUrl(message?: string): string {
  const baseUrl = `https://wa.me/${siteConfig.contactWhatsapp}`;

  if (!message?.trim()) {
    return baseUrl;
  }

  return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
}

export function createSeoDescription(
  value: string | null | undefined,
  fallback: string = siteConfig.description,
): string {
  const normalizedValue = (value ?? "").replace(/\s+/g, " ").trim();

  if (!normalizedValue) {
    return fallback;
  }

  if (normalizedValue.length <= 155) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, 152).trimEnd()}...`;
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export const seoRegions = productRegions;

export type SeoRegion = (typeof seoRegions)[number];

export function getSeoRegionBySlug(slug: string): SeoRegion | null {
  return seoRegions.find((region) => region.slug === slug) ?? null;
}
