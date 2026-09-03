"use client";

import { useActionState, useRef, useState } from "react";
import type { ContentStatus } from "@/lib/content-enums";
import type { ContentFormState } from "./actions";
import { BlogCoverImageUploader } from "./BlogCoverImageUploader";

type Values = {
  title?: string;
  slug?: string;
  excerpt?: string | null;
  body?: string;
  status?: ContentStatus;
  coverImage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  noIndex?: boolean;
  publishedAt?: Date | null;
};

type Props = {
  action: (state: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  values?: Values;
  submitLabel: string;
};

type LinkAppearance = "TEXT" | "CTA";

const input =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

export function ContentForm({ action, values = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [bodyValue, setBodyValue] = useState(values.body || "");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkAppearance, setLinkAppearance] = useState<LinkAppearance>("TEXT");
  const [linkError, setLinkError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  const dateValue = values.publishedAt
    ? new Date(
        values.publishedAt.getTime() -
          values.publishedAt.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";

  function addLinkToBody() {
    const label = linkLabel.trim();
    const url = linkUrl.trim();

    if (!label || !url) {
      setLinkError("Bağlantı metni ve URL alanlarını doldur.");
      return;
    }

    let parsedUrl: URL | null = null;

    try {
      parsedUrl = new URL(url);
    } catch {
      if (!url.startsWith("/")) {
        setLinkError("Geçerli bir URL gir. Örn: https://site.com/sayfa");
        return;
      }
    }

    if (parsedUrl && !["http:", "https:"].includes(parsedUrl.protocol)) {
      setLinkError("Yalnızca http veya https bağlantıları kullanılabilir.");
      return;
    }

    const snippet =
      linkAppearance === "CTA"
        ? `[cta:${label}](${url})`
        : `[${label}](${url})`;

    const textarea = bodyRef.current;
    const start = textarea?.selectionStart ?? bodyValue.length;
    const end = textarea?.selectionEnd ?? bodyValue.length;

    const before = bodyValue.slice(0, start);
    const after = bodyValue.slice(end);

    const needsLeadingBreak = before.length > 0 && !before.endsWith("\n");
    const needsTrailingBreak = after.length > 0 && !after.startsWith("\n");

    const inserted =
      `${needsLeadingBreak ? "\n\n" : ""}${snippet}${
        needsTrailingBreak ? "\n\n" : ""
      }`;

    const nextBody = `${before}${inserted}${after}`;

    setBodyValue(nextBody);
    setLinkLabel("");
    setLinkUrl("");
    setLinkError("");

    requestAnimationFrame(() => {
      if (!textarea) return;

      const caretPosition = before.length + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}

      <input type="hidden" name="type" value="BLOG" />

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
              Blog yazısı
            </p>

            <h2 className="mt-1 text-lg font-black text-neutral-950">
              Temel bilgiler
            </h2>
          </div>

          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold text-neutral-500">
            İçerik odaklı panel
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Durum
            <select
              name="status"
              defaultValue={values.status || "DRAFT"}
              className={input}
            >
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayında</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Yayın tarihi
            <input
              type="datetime-local"
              name="publishedAt"
              defaultValue={dateValue}
              className={input}
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Başlık
            <input
              name="title"
              required
              defaultValue={values.title || ""}
              className={input}
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Slug
            <input
              name="slug"
              defaultValue={values.slug || ""}
              placeholder="Boş bırakılırsa başlıktan otomatik oluşur"
              className={input}
            />
          </label>

          <label className="text-sm font-medium md:col-span-2">
            Kısa açıklama
            <textarea
              name="excerpt"
              rows={3}
              defaultValue={values.excerpt || ""}
              className={input}
            />
          </label>

          <BlogCoverImageUploader defaultValue={values.coverImage} />
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-neutral-950">Yazı içeriği</h2>

        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Ana ara başlık için <strong>##</strong>, alt başlık için{" "}
          <strong>###</strong> kullanabilirsin.
        </p>

        <textarea
          ref={bodyRef}
          name="body"
          required
          rows={24}
          value={bodyValue}
          onChange={(event) => setBodyValue(event.target.value)}
          className={`${input} min-h-[520px] font-mono leading-7`}
        />

        <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-600">
                Bağlantı / CTA
              </p>

              <h3 className="mt-1 text-base font-black text-neutral-950">
                Yazının içine bağlantı ekle
              </h3>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500">
                İmleci içerikte istediğin yere getir, bağlantı bilgilerini doldur
                ve ekle. Dış bağlantılar güvenli şekilde aynı sekmede açılır.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Bağlantı metni
              <input
                type="text"
                value={linkLabel}
                onChange={(event) => setLinkLabel(event.target.value)}
                placeholder="Örn: İlgili kaynağı incele"
                className={input}
              />
            </label>

            <label className="text-sm font-medium">
              Hedef URL
              <input
                type="text"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://site.com/sayfa"
                className={input}
              />
            </label>

            <label className="text-sm font-medium md:col-span-2">
              Görünüm
              <select
                value={linkAppearance}
                onChange={(event) =>
                  setLinkAppearance(event.target.value as LinkAppearance)
                }
                className={input}
              >
                <option value="TEXT">Metin bağlantısı</option>
                <option value="CTA">CTA butonu</option>
              </select>
            </label>
          </div>

          {linkError ? (
            <p className="mt-3 text-sm font-medium text-red-600">{linkError}</p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addLinkToBody}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              İçeriğe ekle
            </button>

            <p className="text-xs text-neutral-500">
              Metin bağlantısı: <code>[Metin](URL)</code> · CTA:{" "}
              <code>[cta:Metin](URL)</code>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
            SEO
          </p>

          <h2 className="mt-1 text-lg font-black text-neutral-950">
            Arama görünümü
          </h2>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="text-sm font-medium">
            SEO başlığı
            <input
              name="seoTitle"
              defaultValue={values.seoTitle || ""}
              className={input}
            />
          </label>

          <label className="text-sm font-medium">
            Meta açıklama
            <textarea
              name="seoDescription"
              rows={3}
              defaultValue={values.seoDescription || ""}
              className={input}
            />
          </label>

          <label className="text-sm font-medium">
            Canonical URL
            <input
              name="canonicalUrl"
              type="url"
              defaultValue={values.canonicalUrl || ""}
              className={input}
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium">
            <input
              type="checkbox"
              name="noIndex"
              defaultChecked={values.noIndex}
            />
            Bu yazıyı arama motorlarında indeksleme
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          disabled={pending}
          className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? "Kaydediliyor..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
