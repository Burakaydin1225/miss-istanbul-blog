"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ListingStatus,
  Prisma,
  ProductCategory,
  SubscriptionPaymentType,
  UserRole,
} from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { deleteR2FilesByUrls } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";
import {
  isProductRegionSlug,
  productRegions,
} from "@/lib/product-regions";

export type ProductFormState = {
  error?: string;
  success?: string;
};

type ProductDetailTable = {
  title: string;
  hasHeader: boolean;
  rows: string[][];
};

type ProductWhatsappButtonInput = {
  label: string;
  phoneNumber: string;
  sortOrder: number;
  isActive: boolean;
};

type ProductImageInput = {
  imageUrl: string;
  altText: string | null;
};

type ProductFormValues = {
  name: string;
  shortDescription: string | null;
  description: string;
  detailTable: ProductDetailTable | null;
  coverImage: string;
  coverImageAlt: string | null;
  cardTag: string | null;
  region: string | null;
  whatsappNumber: string | null;
  whatsappButtons: ProductWhatsappButtonInput[];
  category: ProductCategory;
  extraImages: ProductImageInput[];
  sortOrder: number;
  subscriptionFee: string;
  initialSubscriptionDuration:
    SubscriptionRenewalDuration | null;
  initialPaymentAmount: string | null;
  isActive: boolean;
  districtId: string | null;
  neighborhoodId: string | null;
  listingCategoryId: string | null;
  status: ListingStatus;
  priority: number;
  publishedAt: Date | null;
  expiresAt: Date | null;
  featuredOnHome: boolean;
  featuredOnListings: boolean;
  featuredOnDistrict: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
  noIndex: boolean;
};

type ProductFormParseResult =
  | {
      success: true;
      values: ProductFormValues;
    }
  | {
      success: false;
      error: string;
    };

type DetailTableParseResult =
  | {
      success: true;
      value: ProductDetailTable | null;
    }
  | {
      success: false;
      error: string;
    };

const MAX_POSITION_PER_CATEGORY = 100;
const MAXIMUM_CARD_TAG_LENGTH = 40;
const MAXIMUM_WHATSAPP_BUTTONS_PER_PRODUCT = 12;
const MAXIMUM_WHATSAPP_BUTTON_LABEL_LENGTH = 40;

const MINIMUM_DETAIL_TABLE_ROWS = 2;
const MAXIMUM_DETAIL_TABLE_ROWS = 12;
const MAXIMUM_DETAIL_TABLE_COLUMNS = 3;
const MAXIMUM_DETAIL_TABLE_TITLE_LENGTH = 80;
const MAXIMUM_DETAIL_TABLE_CELL_LENGTH = 160;

const categoryLabels: Record<
  ProductCategory,
  string
> = {
  [ProductCategory.VIP]: "VIP",
  [ProductCategory.PREMIUM]: "Premium",
  [ProductCategory.GOLD]: "Gold",
};

const SUBSCRIPTION_RENEWAL_DURATION = {
  ONE_WEEK: "ONE_WEEK",
  TWO_WEEKS: "TWO_WEEKS",
  THREE_WEEKS: "THREE_WEEKS",
  ONE_MONTH: "ONE_MONTH",
} as const;

type SubscriptionRenewalDuration =
  (typeof SUBSCRIPTION_RENEWAL_DURATION)[keyof typeof SUBSCRIPTION_RENEWAL_DURATION];

const subscriptionRenewalDurationLabels: Record<
  SubscriptionRenewalDuration,
  string
> = {
  [SUBSCRIPTION_RENEWAL_DURATION.ONE_WEEK]:
    "1 hafta",
  [SUBSCRIPTION_RENEWAL_DURATION.TWO_WEEKS]:
    "2 hafta",
  [SUBSCRIPTION_RENEWAL_DURATION.THREE_WEEKS]:
    "3 hafta",
  [SUBSCRIPTION_RENEWAL_DURATION.ONE_MONTH]:
    "1 ay",
};

function slugify(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidImageUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeWhatsappNumber(
  value: string,
): string {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (
    digits.length === 11 &&
    digits.startsWith("0")
  ) {
    digits = `90${digits.slice(1)}`;
  }

  if (
    digits.length === 10 &&
    digits.startsWith("5")
  ) {
    digits = `90${digits}`;
  }

  return digits;
}

function isValidWhatsappNumber(
  value: string,
): boolean {
  return (
    value.length >= 10 &&
    value.length <= 15 &&
    /^\d+$/.test(value) &&
    !/^0+$/.test(value)
  );
}


type WhatsappButtonsParseResult =
  | {
      success: true;
      value: ProductWhatsappButtonInput[];
    }
  | {
      success: false;
      error: string;
    };

function parseWhatsappButtons(
  rawValue: string,
  legacyWhatsappNumber: string | null,
): WhatsappButtonsParseResult {
  const rawButtons = rawValue.trim();

  if (!rawButtons) {
    return {
      success: true,
      value: legacyWhatsappNumber
        ? [
            {
              label: "WhatsApp ile bilgi al",
              phoneNumber: legacyWhatsappNumber,
              sortOrder: 0,
              isActive: true,
            },
          ]
        : [],
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawButtons);
  } catch {
    return {
      success: false,
      error:
        "WhatsApp butonları okunamadı. Sayfayı yenileyip tekrar deneyin.",
    };
  }

  if (!Array.isArray(parsedValue)) {
    return {
      success: false,
      error:
        "WhatsApp butonlarının veri biçimi geçersiz.",
    };
  }

  if (
    parsedValue.length >
    MAXIMUM_WHATSAPP_BUTTONS_PER_PRODUCT
  ) {
    return {
      success: false,
      error: `Bir üründe en fazla ${MAXIMUM_WHATSAPP_BUTTONS_PER_PRODUCT} WhatsApp butonu olabilir.`,
    };
  }

  const whatsappButtons: ProductWhatsappButtonInput[] = [];

  for (const [index, item] of parsedValue.entries()) {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item)
    ) {
      continue;
    }

    const record = item as Record<
      string,
      unknown
    >;

    const rawPhoneNumber =
      typeof record.phoneNumber === "string"
        ? record.phoneNumber.trim()
        : "";

    /*
     * Numarası boş olan satırları yok sayıyoruz.
     * Böylece yeni ürün formunda varsayılan boş satır
     * hata üretmeden kalabilir.
     */
    if (!rawPhoneNumber) {
      continue;
    }

    const phoneNumber =
      normalizeWhatsappNumber(rawPhoneNumber);

    if (!isValidWhatsappNumber(phoneNumber)) {
      return {
        success: false,
        error: `${index + 1}. WhatsApp butonunda geçerli bir numara girin. Örnek: +90 555 555 55 55`,
      };
    }

    const rawLabel =
      typeof record.label === "string"
        ? record.label.trim()
        : "";

    const label =
      rawLabel ||
      (index === 0
        ? "WhatsApp ile bilgi al"
        : `WhatsApp ${index + 1}`);

    if (
      label.length >
      MAXIMUM_WHATSAPP_BUTTON_LABEL_LENGTH
    ) {
      return {
        success: false,
        error: `${index + 1}. WhatsApp butonu başlığı en fazla ${MAXIMUM_WHATSAPP_BUTTON_LABEL_LENGTH} karakter olabilir.`,
      };
    }

    whatsappButtons.push({
      label,
      phoneNumber,
      sortOrder: whatsappButtons.length,
      isActive: record.isActive !== false,
    });
  }

  return {
    success: true,
    value: whatsappButtons,
  };
}

function normalizeSubscriptionFee(
  value: string,
): string | null {
  let normalizedValue = value
    .trim()
    .replace(/\s/g, "")
    .replace(/₺/g, "")
    .replace(/TRY/gi, "")
    .replace(/TL/gi, "");

  if (!normalizedValue) {
    return null;
  }

  /*
   * Türkçe para biçimleri:
   *
   * 1.500,50 -> 1500.50
   * 1500,50  -> 1500.50
   * 1500     -> 1500.00
   */
  if (normalizedValue.includes(",")) {
    normalizedValue = normalizedValue
      .replace(/\./g, "")
      .replace(",", ".");
  }

  const amount = Number(normalizedValue);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 9999999999.99
  ) {
    return null;
  }

  return amount.toFixed(2);
}

function normalizeDetailTableCell(
  value: unknown,
): string {
  if (
    typeof value !== "string" &&
    typeof value !== "number" &&
    typeof value !== "boolean"
  ) {
    return "";
  }

  return String(value).trim();
}

function parseDetailTable(
  rawValue: string,
): DetailTableParseResult {
  if (!rawValue.trim()) {
    return {
      success: true,
      value: null,
    };
  }

  let parsedValue: unknown;

  try {
    parsedValue = JSON.parse(rawValue);
  } catch {
    return {
      success: false,
      error:
        "Özellik tablosu okunamadı. Sayfayı yenileyip tekrar deneyin.",
    };
  }

  if (
    !parsedValue ||
    typeof parsedValue !== "object" ||
    Array.isArray(parsedValue)
  ) {
    return {
      success: false,
      error:
        "Özellik tablosunun veri biçimi geçersiz.",
    };
  }

  const record = parsedValue as Record<
    string,
    unknown
  >;

  if (!Array.isArray(record.rows)) {
    return {
      success: false,
      error:
        "Özellik tablosunda satır bilgisi bulunamadı.",
    };
  }

  if (
    record.rows.length >
    MAXIMUM_DETAIL_TABLE_ROWS
  ) {
    return {
      success: false,
      error: `Özellik tablosunda en fazla ${MAXIMUM_DETAIL_TABLE_ROWS} satır olabilir.`,
    };
  }

  const rawRows = record.rows;

  const maximumColumnCount = Math.max(
    0,
    ...rawRows.map((row) =>
      Array.isArray(row) ? row.length : 0,
    ),
  );

  if (
    maximumColumnCount < 2 ||
    maximumColumnCount >
      MAXIMUM_DETAIL_TABLE_COLUMNS
  ) {
    return {
      success: false,
      error:
        "Özellik tablosu 2 veya 3 sütundan oluşmalıdır.",
    };
  }

  const columnCount =
    maximumColumnCount >= 3 ? 3 : 2;

  const normalizedRows = rawRows
    .filter((row): row is unknown[] =>
      Array.isArray(row),
    )
    .map((row) =>
      Array.from(
        {
          length: columnCount,
        },
        (_, columnIndex) =>
          normalizeDetailTableCell(
            row[columnIndex],
          ),
      ),
    )
    .filter((row) =>
      row.some(
        (cell) => cell.length > 0,
      ),
    );

  if (normalizedRows.length === 0) {
    return {
      success: true,
      value: null,
    };
  }

  if (
    normalizedRows.length <
    MINIMUM_DETAIL_TABLE_ROWS
  ) {
    return {
      success: false,
      error: `Özellik tablosunda en az ${MINIMUM_DETAIL_TABLE_ROWS} dolu satır bulunmalıdır.`,
    };
  }

  const hasLongCell =
    normalizedRows.some((row) =>
      row.some(
        (cell) =>
          cell.length >
          MAXIMUM_DETAIL_TABLE_CELL_LENGTH,
      ),
    );

  if (hasLongCell) {
    return {
      success: false,
      error: `Özellik tablosundaki her hücre en fazla ${MAXIMUM_DETAIL_TABLE_CELL_LENGTH} karakter olabilir.`,
    };
  }

  const hasHeader =
    record.hasHeader === true;

  if (
    hasHeader &&
    normalizedRows.length < 2
  ) {
    return {
      success: false,
      error:
        "Başlık satırının altında en az bir veri satırı bulunmalıdır.",
    };
  }

  const rawTitle =
    typeof record.title === "string"
      ? record.title.trim()
      : "";

  const title =
    rawTitle || "Ürün özellikleri";

  if (
    title.length >
    MAXIMUM_DETAIL_TABLE_TITLE_LENGTH
  ) {
    return {
      success: false,
      error: `Özellik tablosu başlığı en fazla ${MAXIMUM_DETAIL_TABLE_TITLE_LENGTH} karakter olabilir.`,
    };
  }

  return {
    success: true,
    value: {
      title,
      hasHeader,
      rows: normalizedRows,
    },
  };
}

function isValidProductRegion(
  value: string,
): boolean {
  return isProductRegionSlug(value);
}

function isProductCategory(
  value: string,
): value is ProductCategory {
  return Object.values(ProductCategory).includes(
    value as ProductCategory,
  );
}


function isListingStatus(value: string): value is ListingStatus {
  return Object.values(ListingStatus).includes(value as ListingStatus);
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null | "INVALID" {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed;
}

function normalizeOptionalUrl(value: string): string | null | "INVALID" {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : "INVALID";
  } catch {
    return "INVALID";
  }
}

function isUniqueConstraintError(
  error: unknown,
): boolean {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  return error.code === "P2002";
}

function addCalendarMonths(
  date: Date,
  monthCount: number,
): Date {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(
    result.getMonth() + monthCount,
  );

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(
    Math.min(
      originalDay,
      lastDayOfTargetMonth,
    ),
  );

  return result;
}

function addCalendarDays(
  date: Date,
  dayCount: number,
): Date {
  const result = new Date(date);

  result.setDate(
    result.getDate() + dayCount,
  );

  return result;
}

function isSubscriptionRenewalDuration(
  value: string,
): value is SubscriptionRenewalDuration {
  return Object.values(
    SUBSCRIPTION_RENEWAL_DURATION,
  ).includes(
    value as SubscriptionRenewalDuration,
  );
}

function getRenewalPeriodEnd(
  periodStart: Date,
  duration: SubscriptionRenewalDuration,
): Date {
  switch (duration) {
    case SUBSCRIPTION_RENEWAL_DURATION.ONE_WEEK:
      return addCalendarDays(
        periodStart,
        7,
      );

    case SUBSCRIPTION_RENEWAL_DURATION.TWO_WEEKS:
      return addCalendarDays(
        periodStart,
        14,
      );

    case SUBSCRIPTION_RENEWAL_DURATION.THREE_WEEKS:
      return addCalendarDays(
        periodStart,
        21,
      );

    case SUBSCRIPTION_RENEWAL_DURATION.ONE_MONTH:
      return addCalendarMonths(
        periodStart,
        1,
      );
  }
}

function readProductForm(
  formData: FormData,
): ProductFormParseResult {
  const name = String(
    formData.get("name") ?? "",
  ).trim();

  const shortDescription =
    String(
      formData.get("shortDescription") ?? "",
    ).trim() || null;

  const description = String(
    formData.get("description") ?? "",
  ).trim();

  const rawDetailTable = String(
    formData.get("detailTable") ?? "",
  );

  const detailTableResult =
    parseDetailTable(rawDetailTable);

  if (!detailTableResult.success) {
    return {
      success: false,
      error: detailTableResult.error,
    };
  }

  const coverImage = String(
    formData.get("coverImage") ?? "",
  ).trim();

  const cardTag =
    String(formData.get("cardTag") ?? "")
      .trim() || null;

  const rawRegion = String(
    formData.get("region") ?? "",
  ).trim();

  const region = rawRegion || null;

  const rawWhatsappNumber = String(
    formData.get("whatsappNumber") ?? "",
  ).trim();

  const legacyWhatsappNumber = rawWhatsappNumber
    ? normalizeWhatsappNumber(
        rawWhatsappNumber,
      )
    : null;

  const whatsappButtonsResult =
    parseWhatsappButtons(
      String(
        formData.get("whatsappButtons") ?? "",
      ),
      legacyWhatsappNumber,
    );

  if (!whatsappButtonsResult.success) {
    return {
      success: false,
      error: whatsappButtonsResult.error,
    };
  }

  const whatsappButtons =
    whatsappButtonsResult.value;

  const whatsappNumber =
    whatsappButtons.find(
      (button) => button.isActive,
    )?.phoneNumber ??
    legacyWhatsappNumber;

  const rawCategory = String(
    formData.get("category") ?? "",
  ).trim();

  const sortOrderValue = Number(
    formData.get("sortOrder"),
  );

  const rawSubscriptionFee = String(
    formData.get("subscriptionFee") ?? "",
  ).trim();

  const subscriptionFee =
    normalizeSubscriptionFee(
      rawSubscriptionFee,
    );

  const rawInitialSubscriptionDuration =
    String(
      formData.get(
        "initialSubscriptionDuration",
      ) ?? "",
    ).trim();

  const initialSubscriptionDuration =
    isSubscriptionRenewalDuration(
      rawInitialSubscriptionDuration,
    )
      ? rawInitialSubscriptionDuration
      : null;

  const rawInitialPaymentAmount =
    String(
      formData.get(
        "initialPaymentAmount",
      ) ?? "",
    ).trim();

  const initialPaymentAmount =
    rawInitialPaymentAmount
      ? normalizeSubscriptionFee(
          rawInitialPaymentAmount,
        )
      : null;

  const isActive =
    formData.get("isActive") === "on";

  const districtId = String(formData.get("districtId") ?? "").trim() || null;
  const neighborhoodId = String(formData.get("neighborhoodId") ?? "").trim() || null;
  const listingCategoryId = String(formData.get("listingCategoryId") ?? "").trim() || null;
  const rawStatus = String(formData.get("status") ?? ListingStatus.PUBLISHED).trim();
  const priority = Number(formData.get("priority") ?? 0);
  const publishedAt = parseOptionalDate(formData.get("publishedAt"));
  const expiresAt = parseOptionalDate(formData.get("expiresAt"));
  const featuredOnHome = formData.get("featuredOnHome") === "on";
  const featuredOnListings = formData.get("featuredOnListings") === "on";
  const featuredOnDistrict = formData.get("featuredOnDistrict") === "on";
  const seoTitle = String(formData.get("seoTitle") ?? "").trim() || null;
  const seoDescription = String(formData.get("seoDescription") ?? "").trim() || null;
  const canonicalUrl = normalizeOptionalUrl(String(formData.get("canonicalUrl") ?? ""));
  const noIndex = formData.get("noIndex") === "on";

  const coverImageAlt = String(formData.get("coverImageAlt") ?? "").trim() || null;

  let extraImages: ProductImageInput[] = [];
  const rawImageMetadata = String(formData.get("extraImagesMetadata") ?? "").trim();

  if (rawImageMetadata) {
    try {
      const parsed = JSON.parse(rawImageMetadata) as unknown;
      if (!Array.isArray(parsed)) {
        return { success: false, error: "Görsel sıralama verisi geçersiz." };
      }

      const seen = new Set<string>();
      for (const item of parsed) {
        if (!item || typeof item !== "object") continue;
        const imageUrl = String((item as { imageUrl?: unknown }).imageUrl ?? "").trim();
        const altTextValue = String((item as { altText?: unknown }).altText ?? "").trim();
        if (!imageUrl || imageUrl === coverImage || seen.has(imageUrl)) continue;
        seen.add(imageUrl);
        extraImages.push({ imageUrl, altText: altTextValue || null });
      }
    } catch {
      return { success: false, error: "Görsel sıralama verisi okunamadı." };
    }
  } else {
    extraImages = String(formData.get("extraImages") ?? "")
      .split(/\r?\n/)
      .map((imageUrl) => imageUrl.trim())
      .filter(Boolean)
      .filter((imageUrl, index, images) => images.indexOf(imageUrl) === index)
      .filter((imageUrl) => imageUrl !== coverImage)
      .map((imageUrl) => ({ imageUrl, altText: null }));
  }

  if (name.length < 2) {
    return {
      success: false,
      error:
        "Ürün adı en az 2 karakter olmalıdır.",
    };
  }

  if (!description) {
    return {
      success: false,
      error:
        "Ürün açıklaması zorunludur.",
    };
  }

  if (
    !coverImage ||
    !isValidImageUrl(coverImage)
  ) {
    return {
      success: false,
      error:
        "Geçerli bir HTTPS kapak görseli yükleyin.",
    };
  }

  if (
    cardTag &&
    cardTag.length > MAXIMUM_CARD_TAG_LENGTH
  ) {
    return {
      success: false,
      error: `Kart etiketi en fazla ${MAXIMUM_CARD_TAG_LENGTH} karakter olabilir.`,
    };
  }

  if (
    region &&
    !isValidProductRegion(region)
  ) {
    return {
      success: false,
      error: "Geçerli bir bölge seçin.",
    };
  }

  if (
    extraImages.some(
      (image) => !isValidImageUrl(image.imageUrl),
    )
  ) {
    return {
      success: false,
      error:
        "Ek görsellerin tamamı geçerli bir HTTPS bağlantısı olmalıdır.",
    };
  }

  if (
    whatsappNumber &&
    !isValidWhatsappNumber(
      whatsappNumber,
    )
  ) {
    return {
      success: false,
      error:
        "Geçerli bir WhatsApp numarası girin. Örnek: +90 555 555 55 55",
    };
  }


  if (!isListingStatus(rawStatus)) {
    return { success: false, error: "Geçerli bir yayın durumu seçin." };
  }

  if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
    return { success: false, error: "Öncelik puanı 0 ile 1000 arasında olmalıdır." };
  }

  if (publishedAt === "INVALID" || expiresAt === "INVALID") {
    return { success: false, error: "Yayın başlangıç veya bitiş tarihi geçersiz." };
  }

  if (publishedAt && expiresAt && expiresAt <= publishedAt) {
    return { success: false, error: "Yayın bitiş tarihi başlangıç tarihinden sonra olmalıdır." };
  }

  if (seoTitle && seoTitle.length > 70) {
    return { success: false, error: "SEO başlığı en fazla 70 karakter olabilir." };
  }

  if (seoDescription && seoDescription.length > 180) {
    return { success: false, error: "SEO açıklaması en fazla 180 karakter olabilir." };
  }

  if (canonicalUrl === "INVALID") {
    return { success: false, error: "Canonical adresi geçerli bir HTTPS bağlantısı olmalıdır." };
  }

  if (neighborhoodId && !districtId) {
    return { success: false, error: "Mahalle seçmek için önce ilçe seçin." };
  }

  if (!isProductCategory(rawCategory)) {
    return {
      success: false,
      error:
        "Geçerli bir ürün kategorisi seçin.",
    };
  }

  if (
    !Number.isInteger(sortOrderValue) ||
    sortOrderValue < 1 ||
    sortOrderValue >
      MAX_POSITION_PER_CATEGORY
  ) {
    return {
      success: false,
      error:
        "Kategori içindeki sıra numarası 1 ile 100 arasında olmalıdır.",
    };
  }

  if (subscriptionFee === null) {
    return {
      success: false,
      error:
        "Geçerli bir aylık abonelik ücreti girin.",
    };
  }

  return {
    success: true,
    values: {
      name,
      shortDescription,
      description,
      detailTable:
        detailTableResult.value,
      coverImage,
      coverImageAlt,
      cardTag,
      region,
      whatsappNumber,
      whatsappButtons,
      category: rawCategory,
      extraImages,
      sortOrder: sortOrderValue,
      subscriptionFee,
      initialSubscriptionDuration,
      initialPaymentAmount,
      isActive,
      districtId,
      neighborhoodId,
      listingCategoryId,
      status: rawStatus,
      priority,
      publishedAt,
      expiresAt,
      featuredOnHome,
      featuredOnListings,
      featuredOnDistrict,
      seoTitle,
      seoDescription,
      canonicalUrl,
      noIndex,
    },
  };
}

async function createUniqueSlug(
  name: string,
): Promise<string> {
  const baseSlug =
    slugify(name) || "urun";

  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.product.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function findPositionOwner(
  category: ProductCategory,
  sortOrder: number,
  excludedProductId?: string,
) {
  return prisma.product.findFirst({
    where: {
      category,
      sortOrder,
      ...(excludedProductId
        ? {
            id: {
              not: excludedProductId,
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      sortOrder: true,
    },
  });
}

function getOccupiedPositionMessage(
  category: ProductCategory,
  sortOrder: number,
  productName?: string,
): string {
  const categoryLabel =
    categoryLabels[category];

  if (productName) {
    return `${categoryLabel} kategorisindeki ${sortOrder}. sıra şu anda "${productName}" ürünü tarafından kullanılıyor. Lütfen boş bir sıra seçin.`;
  }

  return `${categoryLabel} kategorisindeki ${sortOrder}. sıra şu anda kullanılıyor. Lütfen boş bir sıra seçin.`;
}

function refreshProductPages(
  slug?: string,
  productId?: string,
): void {
  revalidatePath("/");
  revalidatePath("/panel");
  revalidatePath("/panel/urunler");
  revalidatePath("/panel/urunler/yeni");

  for (const region of productRegions) {
    revalidatePath(`/bolge/${region.slug}`);
  }

  if (slug) {
    revalidatePath(`/urun/${slug}`);
  }

  if (productId) {
    revalidatePath(
      `/panel/urunler/${productId}`,
    );

    revalidatePath(
      `/panel/urunler/${productId}/duzenle`,
    );
  }
}

function getUniqueUrls(
  urls: string[],
): string[] {
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  );
}

async function deleteUnusedR2Files(
  fileUrls: string[],
  errorMessage: string,
): Promise<void> {
  const uniqueUrls =
    getUniqueUrls(fileUrls);

  if (uniqueUrls.length === 0) {
    return;
  }

  try {
    const usageResults =
      await Promise.all(
        uniqueUrls.map(async (fileUrl) => {
          const [
            coverUsage,
            galleryUsage,
          ] = await Promise.all([
            prisma.product.findFirst({
              where: {
                coverImage: fileUrl,
              },
              select: {
                id: true,
              },
            }),

            prisma.productImage.findFirst({
              where: {
                imageUrl: fileUrl,
              },
              select: {
                id: true,
              },
            }),
          ]);

          return coverUsage ||
            galleryUsage
            ? null
            : fileUrl;
        }),
      );

    const unusedUrls =
      usageResults.filter(
        (
          fileUrl,
        ): fileUrl is string =>
          typeof fileUrl === "string",
      );

    if (unusedUrls.length > 0) {
      await deleteR2FilesByUrls(
        unusedUrls,
      );
    }
  } catch (error) {
    console.error(
      errorMessage,
      error,
    );
  }
}

export async function createProductAction(
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const parseResult =
    readProductForm(formData);

  if (!parseResult.success) {
    return {
      error: parseResult.error,
    };
  }

  const values = parseResult.values;

  const [district, neighborhood, listingCategory] = await Promise.all([
    values.districtId ? prisma.district.findUnique({ where: { id: values.districtId }, select: { id: true, slug: true } }) : null,
    values.neighborhoodId ? prisma.neighborhood.findUnique({ where: { id: values.neighborhoodId }, select: { id: true, districtId: true } }) : null,
    values.listingCategoryId ? prisma.listingCategory.findUnique({ where: { id: values.listingCategoryId }, select: { id: true } }) : null,
  ]);

  if (values.districtId && !district) return { error: "Seçilen ilçe bulunamadı." };
  if (values.neighborhoodId && (!neighborhood || neighborhood.districtId !== values.districtId)) return { error: "Seçilen mahalle bu ilçeye ait değil." };
  if (values.listingCategoryId && !listingCategory) return { error: "Seçilen ilan kategorisi bulunamadı." };

  if (
    !values.initialSubscriptionDuration
  ) {
    return {
      error:
        "İlk abonelik süresini seçin.",
    };
  }

  if (
    values.initialPaymentAmount === null
  ) {
    return {
      error:
        "Geçerli bir ilk ödeme tutarı girin.",
    };
  }

  const initialSubscriptionDuration =
    values.initialSubscriptionDuration;

  const initialPaymentAmount =
    values.initialPaymentAmount;

  const uploadedImageUrls = [
    values.coverImage,
    ...values.extraImages.map((image) => image.imageUrl),
  ];

  const categoryProductCount =
    await prisma.product.count({
      where: {
        category: values.category,
      },
    });

  if (
    categoryProductCount >=
    MAX_POSITION_PER_CATEGORY
  ) {
    await deleteUnusedR2Files(
      uploadedImageUrls,
      "Dolu kategoriye eklenemeyen görseller temizlenemedi:",
    );

    return {
      error: `${categoryLabels[values.category]} kategorisindeki 100 sıranın tamamı dolu.`,
    };
  }

  const positionOwner =
    await findPositionOwner(
      values.category,
      values.sortOrder,
    );

  if (positionOwner) {
    await deleteUnusedR2Files(
      uploadedImageUrls,
      "Dolu sıraya eklenemeyen ürünün görselleri temizlenemedi:",
    );

    return {
      error:
        getOccupiedPositionMessage(
          values.category,
          values.sortOrder,
          positionOwner.name,
        ),
    };
  }

  const slug = await createUniqueSlug(
    values.name,
  );

  const subscriptionPeriodStart =
    new Date();

  const subscriptionPeriodEnd =
    getRenewalPeriodEnd(
      subscriptionPeriodStart,
      initialSubscriptionDuration,
    );

  const initialDurationLabel =
    subscriptionRenewalDurationLabels[
      initialSubscriptionDuration
    ];

  try {
    await prisma.$transaction(
      async (transaction) => {
        const product =
          await transaction.product.create({
            data: {
              name: values.name,
              slug,
              shortDescription:
                values.shortDescription,
              description:
                values.description,

              detailTable:
                values.detailTable
                  ? (values.detailTable as Prisma.InputJsonValue)
                  : Prisma.DbNull,

              coverImage:
                values.coverImage,
              coverImageAlt: values.coverImageAlt,
              cardTag:
                values.cardTag,
              region:
                values.region,
              districtId: values.districtId,
              neighborhoodId: values.neighborhoodId,
              categoryId: values.listingCategoryId,
              status: values.status,
              priority: values.priority,
              publishedAt: values.publishedAt,
              expiresAt: values.expiresAt,
              featuredOnHome: values.featuredOnHome,
              featuredOnListings: values.featuredOnListings,
              featuredOnDistrict: values.featuredOnDistrict,
              seoTitle: values.seoTitle,
              seoDescription: values.seoDescription,
              canonicalUrl: values.canonicalUrl,
              noIndex: values.noIndex,
              whatsappNumber:
                values.whatsappNumber,
              category:
                values.category,
              sortOrder:
                values.sortOrder,
              subscriptionFee:
                values.subscriptionFee,
              subscriptionEndsAt:
                subscriptionPeriodEnd,
              lastRenewedAt:
                subscriptionPeriodStart,
              isActive:
                values.isActive,
              images: {
                create:
                  values.extraImages.map(
                    (image, imageIndex) => ({
                      imageUrl: image.imageUrl,
                      altText: image.altText ?? `${values.name} görseli ${imageIndex + 1}`,
                      sortOrder: imageIndex + 1,
                    }),
                  ),
              },
              whatsappButtons: {
                create:
                  values.whatsappButtons.map(
                    (button) => ({
                      label: button.label,
                      phoneNumber:
                        button.phoneNumber,
                      sortOrder:
                        button.sortOrder,
                      isActive:
                        button.isActive,
                    }),
                  ),
              },
            },
          });

        /*
         * Ücret sıfırdan büyükse ürünün ilk
         * abonelik ödemesini kaydeder.
         */
        if (
          Number(
            initialPaymentAmount,
          ) > 0
        ) {
          await transaction.productPayment.create({
            data: {
              productId:
                product.id,
              productName:
                product.name,
              category:
                product.category,
              amount:
                initialPaymentAmount,
              type:
                SubscriptionPaymentType.INITIAL,
              periodStart:
                subscriptionPeriodStart,
              periodEnd:
                subscriptionPeriodEnd,
              paidAt:
                subscriptionPeriodStart,
              note:
                `Ürün oluşturulurken alınan ${initialDurationLabel} ilk abonelik ödemesi.`,
            },
          });
        }

        await writeAuditLog({
          client: transaction,
          actor: user,
          action: "PRODUCT_CREATE",
          entityType: "Product",
          entityId: product.id,
          description: `${user.name}, "${product.name}" ürününü oluşturdu.`,
          changes: {
            name: product.name,
            slug: product.slug,
            cardTag:
              product.cardTag,
            region:
              product.region,
            category:
              product.category,
            whatsappNumber:
              product.whatsappNumber,
            whatsappButtonCount:
              values.whatsappButtons.length,
            sortOrder:
              product.sortOrder,
            detailTableEnabled:
              values.detailTable !==
              null,
            detailTableRowCount:
              values.detailTable?.rows
                .length ?? 0,
            subscriptionFee:
              product.subscriptionFee.toString(),
            initialSubscriptionDuration,
            initialSubscriptionDurationLabel:
              initialDurationLabel,
            initialPaymentAmount,
            subscriptionEndsAt:
              product.subscriptionEndsAt?.toISOString() ??
              null,
            isActive:
              product.isActive,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Ürün oluşturma işlemi başarısız oldu:",
      error,
    );

    await deleteUnusedR2Files(
      uploadedImageUrls,
      "Oluşturulamayan ürünün görselleri R2'den temizlenemedi:",
    );

    if (
      isUniqueConstraintError(error)
    ) {
      return {
        error:
          getOccupiedPositionMessage(
            values.category,
            values.sortOrder,
          ),
      };
    }

    return {
      error:
        "Ürün oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  refreshProductPages(slug);

  redirect("/panel/urunler");
}

export async function updateProductAction(
  productId: string,
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const parseResult =
    readProductForm(formData);

  if (!parseResult.success) {
    return {
      error: parseResult.error,
    };
  }

  const values = parseResult.values;

  const [district, neighborhood, listingCategory] = await Promise.all([
    values.districtId ? prisma.district.findUnique({ where: { id: values.districtId }, select: { id: true, slug: true } }) : null,
    values.neighborhoodId ? prisma.neighborhood.findUnique({ where: { id: values.neighborhoodId }, select: { id: true, districtId: true } }) : null,
    values.listingCategoryId ? prisma.listingCategory.findUnique({ where: { id: values.listingCategoryId }, select: { id: true } }) : null,
  ]);

  if (values.districtId && !district) return { error: "Seçilen ilçe bulunamadı." };
  if (values.neighborhoodId && (!neighborhood || neighborhood.districtId !== values.districtId)) return { error: "Seçilen mahalle bu ilçeye ait değil." };
  if (values.listingCategoryId && !listingCategory) return { error: "Seçilen ilan kategorisi bulunamadı." };

  const existingProduct =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        images: {
          select: {
            imageUrl: true,
          },
        },
        whatsappButtons: {
          select: {
            id: true,
            label: true,
            phoneNumber: true,
            sortOrder: true,
            isActive: true,
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

  if (!existingProduct) {
    return {
      error:
        "Düzenlenmek istenen ürün bulunamadı.",
    };
  }

  const previousImageUrls =
    getUniqueUrls([
      existingProduct.coverImage,
      ...existingProduct.images.map(
        (image) => image.imageUrl,
      ),
    ]);

  const nextImageUrls =
    getUniqueUrls([
      values.coverImage,
      ...values.extraImages.map((image) => image.imageUrl),
    ]);

  const previousImageSet = new Set(
    previousImageUrls,
  );

  const nextImageSet = new Set(
    nextImageUrls,
  );

  const removedImageUrls =
    previousImageUrls.filter(
      (imageUrl) =>
        !nextImageSet.has(imageUrl),
    );

  const newlyAddedImageUrls =
    nextImageUrls.filter(
      (imageUrl) =>
        !previousImageSet.has(
          imageUrl,
        ),
    );

  const categoryChanged =
    existingProduct.category !==
    values.category;

  if (categoryChanged) {
    const targetCategoryProductCount =
      await prisma.product.count({
        where: {
          category:
            values.category,
          id: {
            not: productId,
          },
        },
      });

    if (
      targetCategoryProductCount >=
      MAX_POSITION_PER_CATEGORY
    ) {
      await deleteUnusedR2Files(
        newlyAddedImageUrls,
        "Dolu kategoriye taşınamayan görseller temizlenemedi:",
      );

      return {
        error: `${categoryLabels[values.category]} kategorisindeki 100 sıranın tamamı dolu.`,
      };
    }
  }

  const positionOwner =
    await findPositionOwner(
      values.category,
      values.sortOrder,
      productId,
    );

  if (positionOwner) {
    await deleteUnusedR2Files(
      newlyAddedImageUrls,
      "Dolu sıraya taşınamayan ürünün yeni görselleri temizlenemedi:",
    );

    return {
      error:
        getOccupiedPositionMessage(
          values.category,
          values.sortOrder,
          positionOwner.name,
        ),
    };
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updatedProduct =
          await transaction.product.update({
            where: {
              id: productId,
            },
            data: {
              name: values.name,
              shortDescription:
                values.shortDescription,
              description:
                values.description,

              detailTable:
                values.detailTable
                  ? (values.detailTable as Prisma.InputJsonValue)
                  : Prisma.DbNull,

              coverImage:
                values.coverImage,
              coverImageAlt: values.coverImageAlt,
              cardTag:
                values.cardTag,
              region:
                values.region,
              districtId: values.districtId,
              neighborhoodId: values.neighborhoodId,
              categoryId: values.listingCategoryId,
              status: values.status,
              priority: values.priority,
              publishedAt: values.publishedAt,
              expiresAt: values.expiresAt,
              featuredOnHome: values.featuredOnHome,
              featuredOnListings: values.featuredOnListings,
              featuredOnDistrict: values.featuredOnDistrict,
              seoTitle: values.seoTitle,
              seoDescription: values.seoDescription,
              canonicalUrl: values.canonicalUrl,
              noIndex: values.noIndex,
              whatsappNumber:
                values.whatsappNumber,
              category:
                values.category,
              sortOrder:
                values.sortOrder,

              /*
               * Ücret düzenlenebilir ancak burada
               * yeni ödeme kaydı oluşturulmaz.
               * Ödeme kaydı yalnızca abonelik
               * yenilendiğinde oluşturulur.
               */
              subscriptionFee:
                values.subscriptionFee,

              isActive:
                values.isActive,
              images: {
                deleteMany: {},
                create:
                  values.extraImages.map(
                    (image, imageIndex) => ({
                      imageUrl: image.imageUrl,
                      altText: image.altText ?? `${values.name} görseli ${imageIndex + 1}`,
                      sortOrder: imageIndex + 1,
                    }),
                  ),
              },
              whatsappButtons: {
                deleteMany: {},
                create:
                  values.whatsappButtons.map(
                    (button) => ({
                      label: button.label,
                      phoneNumber:
                        button.phoneNumber,
                      sortOrder:
                        button.sortOrder,
                      isActive:
                        button.isActive,
                    }),
                  ),
              },
            },
          });

        await writeAuditLog({
          client: transaction,
          actor: user,
          action: "PRODUCT_UPDATE",
          entityType: "Product",
          entityId:
            updatedProduct.id,
          description: `${user.name}, "${updatedProduct.name}" ürününü düzenledi.`,
          changes: {
            before: {
              name:
                existingProduct.name,
              category:
                existingProduct.category,
              shortDescription:
                existingProduct.shortDescription,
              cardTag:
                existingProduct.cardTag,
              region:
                existingProduct.region,
              whatsappNumber:
                existingProduct.whatsappNumber,
              whatsappButtonCount:
                existingProduct.whatsappButtons.length,
              sortOrder:
                existingProduct.sortOrder,
              detailTableEnabled:
                existingProduct.detailTable !==
                null,
              subscriptionFee:
                existingProduct.subscriptionFee.toString(),
              subscriptionEndsAt:
                existingProduct.subscriptionEndsAt?.toISOString() ??
                null,
              isActive:
                existingProduct.isActive,
            },
            after: {
              name:
                updatedProduct.name,
              category:
                updatedProduct.category,
              shortDescription:
                updatedProduct.shortDescription,
              cardTag:
                updatedProduct.cardTag,
              region:
                updatedProduct.region,
              whatsappNumber:
                updatedProduct.whatsappNumber,
              whatsappButtonCount:
                values.whatsappButtons.length,
              sortOrder:
                updatedProduct.sortOrder,
              detailTableEnabled:
                values.detailTable !==
                null,
              detailTableRowCount:
                values.detailTable?.rows
                  .length ?? 0,
              subscriptionFee:
                updatedProduct.subscriptionFee.toString(),
              subscriptionEndsAt:
                updatedProduct.subscriptionEndsAt?.toISOString() ??
                null,
              isActive:
                updatedProduct.isActive,
            },
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Ürün güncelleme işlemi başarısız oldu:",
      error,
    );

    await deleteUnusedR2Files(
      newlyAddedImageUrls,
      "Kaydedilemeyen yeni görseller R2'den temizlenemedi:",
    );

    if (
      isUniqueConstraintError(error)
    ) {
      return {
        error:
          getOccupiedPositionMessage(
            values.category,
            values.sortOrder,
          ),
      };
    }

    return {
      error:
        "Ürün güncellenirken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  await deleteUnusedR2Files(
    removedImageUrls,
    "Üründen kaldırılan görseller R2'den silinemedi:",
  );

  refreshProductPages(
    existingProduct.slug,
    existingProduct.id,
  );

  redirect("/panel/urunler");
}

export async function renewProductSubscriptionAction(
  productId: string,
  _previousState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const user = await requireRole([
    UserRole.ADMIN,
    UserRole.EDITOR,
  ]);

  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        subscriptionFee: true,
        subscriptionEndsAt: true,
      },
    });

  if (!product) {
    return {
      error: "Ürün bulunamadı.",
    };
  }

  const rawDuration = String(
    formData.get("duration") ?? "",
  ).trim();

  if (
    !isSubscriptionRenewalDuration(
      rawDuration,
    )
  ) {
    return {
      error:
        "Geçerli bir abonelik süresi seçin.",
    };
  }

  const duration = rawDuration;

  const rawAmount = String(
    formData.get("amount") ??
      product.subscriptionFee.toString(),
  ).trim();

  const amount =
    normalizeSubscriptionFee(rawAmount);

  if (
    amount === null ||
    Number(amount) <= 0
  ) {
    return {
      error:
        "Aboneliği yenilemek için sıfırdan büyük geçerli bir ödeme tutarı girin.",
    };
  }

  const note =
    String(
      formData.get("note") ?? "",
    ).trim() || null;

  const renewedAt = new Date();

  const periodStart =
    product.subscriptionEndsAt &&
    product.subscriptionEndsAt >
      renewedAt
      ? product.subscriptionEndsAt
      : renewedAt;

  const periodEnd =
    getRenewalPeriodEnd(
      periodStart,
      duration,
    );

  const durationLabel =
    subscriptionRenewalDurationLabels[
      duration
    ];

  const paymentType =
    product.subscriptionEndsAt
      ? SubscriptionPaymentType.RENEWAL
      : SubscriptionPaymentType.INITIAL;

  try {
    await prisma.$transaction(
      async (transaction) => {
        const updatedProduct =
          await transaction.product.update({
            where: {
              id: product.id,
            },
            data: {
              subscriptionEndsAt:
                periodEnd,
              lastRenewedAt:
                renewedAt,
              isActive: true,
            },
          });

        await transaction.productPayment.create({
          data: {
            productId:
              updatedProduct.id,
            productName:
              updatedProduct.name,
            category:
              updatedProduct.category,
            amount,
            type: paymentType,
            periodStart,
            periodEnd,
            paidAt: renewedAt,
            note:
              note ??
              `${durationLabel} abonelik yenileme ödemesi.`,
          },
        });

        await writeAuditLog({
          client: transaction,
          actor: user,
          action:
            "PRODUCT_SUBSCRIPTION_RENEW",
          entityType: "Product",
          entityId:
            updatedProduct.id,
          description: `${user.name}, "${updatedProduct.name}" ürününün aboneliğini ${durationLabel} uzattı.`,
          changes: {
            duration,
            durationLabel,
            amount,
            monthlySubscriptionFee:
              product.subscriptionFee.toString(),
            previousEndDate:
              product.subscriptionEndsAt?.toISOString() ??
              null,
            periodStart:
              periodStart.toISOString(),
            newEndDate:
              periodEnd.toISOString(),
            renewedAt:
              renewedAt.toISOString(),
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Abonelik yenilenirken hata oluştu:",
      error,
    );

    return {
      error:
        "Abonelik yenilenirken bir hata oluştu. Lütfen tekrar deneyin.",
    };
  }

  refreshProductPages(
    product.slug,
    product.id,
  );

  redirect(
    `/panel/urunler/${product.id}`,
  );
}

export async function deleteProductAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireRole([
    UserRole.ADMIN,
  ]);

  const deleteMode = String(
    formData.get("deleteMode") ??
      "KEEP_PAYMENTS",
  );

  const shouldDeletePayments =
    deleteMode === "DELETE_PAYMENTS";

  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },
      include: {
        images: {
          select: {
            imageUrl: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

  if (!product) {
    redirect("/panel/urunler");
  }

  const productImageUrls =
    getUniqueUrls([
      product.coverImage,
      ...product.images.map(
        (image) => image.imageUrl,
      ),
    ]);

  let deletedPaymentCount = 0;

  try {
    await prisma.$transaction(
      async (transaction) => {
        /*
         * Test ürünü tamamen temizlenecekse
         * ödeme kayıtlarını ürün silinmeden önce
         * kaldırıyoruz.
         *
         * Ödemeler korunacaksa Product silinince
         * onDelete: SetNull sayesinde productId
         * boşalır fakat ödeme kaydı kalır.
         */
        if (shouldDeletePayments) {
          const paymentDeleteResult =
            await transaction.productPayment.deleteMany({
              where: {
                productId: product.id,
              },
            });

          deletedPaymentCount =
            paymentDeleteResult.count;
        }

        await transaction.product.delete({
          where: {
            id: product.id,
          },
        });

        await writeAuditLog({
          client: transaction,
          actor: user,
          action: shouldDeletePayments
            ? "PRODUCT_AND_PAYMENTS_DELETE"
            : "PRODUCT_DELETE",
          entityType: "Product",
          entityId: product.id,
          description: shouldDeletePayments
            ? `${user.name}, "${product.name}" ürününü ve ${deletedPaymentCount} ödeme kaydını tamamen sildi.`
            : `${user.name}, "${product.name}" ürününü sildi. Ödeme geçmişi korundu.`,
          changes: {
            name: product.name,
            slug: product.slug,
            category:
              product.category,
            whatsappNumber:
              product.whatsappNumber,
            sortOrder:
              product.sortOrder,
            detailTableEnabled:
              product.detailTable !==
              null,
            subscriptionFee:
              product.subscriptionFee.toString(),
            subscriptionEndsAt:
              product.subscriptionEndsAt?.toISOString() ??
              null,
            isActive:
              product.isActive,
            paymentCountBeforeDelete:
              product._count.payments,
            paymentsDeleted:
              shouldDeletePayments,
            deletedPaymentCount,
          },
        });
      },
    );
  } catch (error) {
    console.error(
      "Ürün silme işlemi başarısız oldu:",
      error,
    );

    throw new Error(
      "Ürün silinirken bir hata oluştu.",
    );
  }

  await deleteUnusedR2Files(
    productImageUrls,
    "Silinen ürünün görselleri R2'den kaldırılamadı:",
  );

  refreshProductPages(product.slug);

  redirect("/panel/urunler");
}

const BULK_PRODUCT_OPERATIONS = [
  "STATUS_PUBLISHED",
  "STATUS_DRAFT",
  "STATUS_PAUSED",
  "STATUS_ARCHIVED",
  "ACTIVATE",
  "DEACTIVATE",
  "TIER_VIP",
  "TIER_PREMIUM",
  "TIER_GOLD",
] as const;

type BulkProductOperation = (typeof BULK_PRODUCT_OPERATIONS)[number];

function isBulkProductOperation(value: string): value is BulkProductOperation {
  return BULK_PRODUCT_OPERATIONS.includes(value as BulkProductOperation);
}

export async function quickUpdateProductStatusAction(
  productId: string,
  formData: FormData,
): Promise<void> {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);
  const rawStatus = String(formData.get("status") ?? "").trim();

  if (!isListingStatus(rawStatus)) return;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true, status: true },
  });

  if (!product || product.status === rawStatus) return;

  await prisma.$transaction(async (transaction) => {
    await transaction.product.update({
      where: { id: product.id },
      data: {
        status: rawStatus,
        isActive: rawStatus === ListingStatus.PUBLISHED ? true : undefined,
        publishedAt:
          rawStatus === ListingStatus.PUBLISHED
            ? product.status === ListingStatus.PUBLISHED
              ? undefined
              : new Date()
            : undefined,
      },
    });

    await writeAuditLog({
      client: transaction,
      actor: user,
      action: "PRODUCT_STATUS_UPDATE",
      entityType: "Product",
      entityId: product.id,
      description: `${user.name}, "${product.name}" ilanının durumunu ${rawStatus} olarak değiştirdi.`,
      changes: { previousStatus: product.status, nextStatus: rawStatus },
    });
  });

  refreshProductPages(product.slug, product.id);
}

export async function bulkUpdateProductsAction(formData: FormData): Promise<void> {
  const user = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);
  const productIds = Array.from(
    new Set(
      formData
        .getAll("productIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);
  const operation = String(formData.get("bulkOperation") ?? "").trim();

  if (productIds.length === 0 || !isBulkProductOperation(operation)) return;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true },
  });

  if (products.length === 0) return;

  const data: Prisma.ProductUpdateManyMutationInput = {};

  if (operation.startsWith("STATUS_")) {
    const statusValue = operation.replace("STATUS_", "");
    if (!isListingStatus(statusValue)) return;
    data.status = statusValue;
    if (statusValue === ListingStatus.PUBLISHED) {
      data.isActive = true;
      data.publishedAt = new Date();
    }
  } else if (operation === "ACTIVATE") {
    data.isActive = true;
  } else if (operation === "DEACTIVATE") {
    data.isActive = false;
  } else if (operation === "TIER_VIP") {
    data.category = ProductCategory.VIP;
  } else if (operation === "TIER_PREMIUM") {
    data.category = ProductCategory.PREMIUM;
  } else if (operation === "TIER_GOLD") {
    data.category = ProductCategory.GOLD;
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.product.updateMany({
      where: { id: { in: products.map((product) => product.id) } },
      data,
    });

    await writeAuditLog({
      client: transaction,
      actor: user,
      action: "PRODUCT_BULK_UPDATE",
      entityType: "Product",
      description: `${user.name}, ${products.length} ilan üzerinde toplu işlem uyguladı.`,
      changes: {
        operation,
        productIds: products.map((product) => product.id),
        productNames: products.map((product) => product.name),
      },
    });
  });

  for (const product of products) refreshProductPages(product.slug, product.id);
}
