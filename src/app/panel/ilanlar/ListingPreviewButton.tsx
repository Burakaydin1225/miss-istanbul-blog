"use client";

import Image from "next/image";
import { type MouseEvent, useEffect, useState } from "react";

type Option = { id: string; name: string };

type ListingPreviewButtonProps = {
  districts: Option[];
  neighborhoods: Option[];
  listingCategories: Option[];
  disabled?: boolean;
};

type PreviewData = {
  name: string;
  shortDescription: string;
  description: string;
  coverImage: string;
  coverImageAlt: string;
  extraImages: { imageUrl: string; altText: string }[];
  district: string;
  neighborhood: string;
  listingCategory: string;
  tier: string;
  cardTag: string;
  whatsappLabel: string;
  whatsappNumber: string;
  status: string;
};

const tierLabels: Record<string, string> = {
  VIP: "VIP",
  PREMIUM: "Premium",
  GOLD: "Gold",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Taslak önizlemesi",
  PUBLISHED: "Yayında",
  PAUSED: "Durduruldu",
  ARCHIVED: "Arşiv",
};

function findName(options: Option[], id: string): string {
  return options.find((option) => option.id === id)?.name ?? "";
}

function parseExtraImages(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "imageUrl" in item &&
        typeof item.imageUrl === "string"
      ) {
        return [
          {
            imageUrl: item.imageUrl,
            altText:
              "altText" in item && typeof item.altText === "string"
                ? item.altText
                : "",
          },
        ];
      }
      return [];
    });
  } catch {
    return [];
  }
}

function parseWhatsapp(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return { label: "WhatsApp ile bilgi al", phoneNumber: "" };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) throw new Error("invalid");

    const active = parsed.find(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "isActive" in item &&
        item.isActive === true &&
        "phoneNumber" in item &&
        typeof item.phoneNumber === "string" &&
        item.phoneNumber.trim(),
    );

    if (typeof active === "object" && active !== null) {
      return {
        label:
          "label" in active && typeof active.label === "string"
            ? active.label
            : "WhatsApp ile bilgi al",
        phoneNumber:
          "phoneNumber" in active && typeof active.phoneNumber === "string"
            ? active.phoneNumber
            : "",
      };
    }
  } catch {
    // Eski/bozuk değerlerde formun diğer alanları yine önizlenir.
  }

  return { label: "WhatsApp ile bilgi al", phoneNumber: "" };
}

export function ListingPreviewButton({
  districts,
  neighborhoods,
  listingCategories,
  disabled = false,
}: ListingPreviewButtonProps) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!preview) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreview(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [preview]);

  function openPreview(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;

    const data = new FormData(form);
    const get = (name: string) => String(data.get(name) ?? "").trim();
    const whatsapp = parseWhatsapp(data.get("whatsappButtons"));

    setActiveImage(0);
    setPreview({
      name: get("name") || "Başlıksız ilan",
      shortDescription: get("shortDescription"),
      description: get("description"),
      coverImage: get("coverImage"),
      coverImageAlt: get("coverImageAlt"),
      extraImages: parseExtraImages(data.get("extraImagesMetadata")),
      district: findName(districts, get("districtId")),
      neighborhood: findName(neighborhoods, get("neighborhoodId")),
      listingCategory: findName(listingCategories, get("listingCategoryId")),
      tier: tierLabels[get("category")] ?? get("category"),
      cardTag: get("cardTag"),
      whatsappLabel: whatsapp.label,
      whatsappNumber: whatsapp.phoneNumber,
      status: statusLabels[get("status")] ?? get("status"),
    });
  }

  const images = preview
    ? [
        ...(preview.coverImage
          ? [
              {
                imageUrl: preview.coverImage,
                altText: preview.coverImageAlt || preview.name,
              },
            ]
          : []),
        ...preview.extraImages,
      ]
    : [];

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={openPreview}
        className="flex h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-800 transition hover:border-neutral-950 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        İlanı önizle
      </button>

      {preview ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="İlan önizlemesi"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPreview(null);
          }}
        >
          <div className="mx-auto min-h-full max-w-6xl">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-xl">
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  Kaydetmeden önce ilan önizlemesi
                </p>
                <p className="text-xs text-neutral-500">
                  Bu ekran ziyaretçinin göreceği sayfanın yaklaşık görünümüdür.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="flex size-10 items-center justify-center rounded-full bg-neutral-100 text-xl text-neutral-700 transition hover:bg-neutral-200"
                aria-label="Önizlemeyi kapat"
              >
                ×
              </button>
            </div>

            <article className="overflow-hidden rounded-[28px] bg-neutral-50 shadow-2xl">
              <div className="border-b border-neutral-200 bg-white px-5 py-3 text-xs text-neutral-500 sm:px-8">
                Ana Sayfa / İlanlar{preview.district ? ` / ${preview.district}` : ""} / {preview.name}
              </div>

              <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
                <div>
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-neutral-200">
                    {images[activeImage]?.imageUrl ? (
                      <Image
                        src={images[activeImage].imageUrl}
                        alt={images[activeImage].altText || preview.name}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="(max-width: 1024px) 100vw, 55vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-8 text-center text-sm text-neutral-500">
                        Kapak görseli yüklendiğinde burada görünecek.
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {preview.tier ? (
                        <span className="rounded-full bg-neutral-950 px-3 py-1.5 text-xs font-bold text-white">
                          {preview.tier}
                        </span>
                      ) : null}
                      {preview.cardTag ? (
                        <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur">
                          {preview.cardTag}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {images.length > 1 ? (
                    <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
                      {images.map((image, index) => (
                        <button
                          key={`${image.imageUrl}-${index}`}
                          type="button"
                          onClick={() => setActiveImage(index)}
                          className={`relative aspect-square overflow-hidden rounded-xl ring-2 transition ${
                            activeImage === index
                              ? "ring-neutral-950"
                              : "ring-transparent hover:ring-neutral-300"
                          }`}
                        >
                          <Image
                            src={image.imageUrl}
                            alt={image.altText || `${preview.name} ${index + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="120px"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="self-start rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.05] sm:p-7">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    {preview.district ? <span>{preview.district}</span> : null}
                    {preview.neighborhood ? <span>• {preview.neighborhood}</span> : null}
                    {preview.listingCategory ? <span>• {preview.listingCategory}</span> : null}
                  </div>

                  <h1 className="mt-3 text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
                    {preview.name}
                  </h1>

                  {preview.shortDescription ? (
                    <p className="mt-4 text-base leading-7 text-neutral-600">
                      {preview.shortDescription}
                    </p>
                  ) : null}

                  <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-xs font-medium text-neutral-600">
                    {preview.status || "Yayın durumu seçilmedi"}
                  </div>

                  <button
                    type="button"
                    disabled={!preview.whatsappNumber}
                    className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                  >
                    {preview.whatsappNumber
                      ? preview.whatsappLabel
                      : "WhatsApp numarası eklenmedi"}
                  </button>

                  <div className="mt-7 border-t border-neutral-200 pt-6">
                    <h2 className="text-lg font-semibold text-neutral-950">İlan açıklaması</h2>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-600">
                      {preview.description || "Detaylı açıklama henüz girilmedi."}
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </>
  );
}
