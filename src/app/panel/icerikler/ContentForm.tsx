"use client";

import { useActionState } from "react";
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

const input =
  "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10";

export function ContentForm({ action, values = {}, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const dateValue = values.publishedAt
    ? new Date(
        values.publishedAt.getTime() -
          values.publishedAt.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";

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
            <h2 className="mt-1 text-lg font-black text-neutral-950">Temel bilgiler</h2>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-bold text-neutral-500">
            İçerik odaklı panel
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Durum
            <select name="status" defaultValue={values.status || "DRAFT"} className={input}>
              <option value="DRAFT">Taslak</option>
              <option value="PUBLISHED">Yayında</option>
              <option value="ARCHIVED">Arşiv</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Yayın tarihi
            <input type="datetime-local" name="publishedAt" defaultValue={dateValue} className={input} />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Başlık
            <input name="title" required defaultValue={values.title || ""} className={input} />
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
            <textarea name="excerpt" rows={3} defaultValue={values.excerpt || ""} className={input} />
          </label>
          <BlogCoverImageUploader defaultValue={values.coverImage} />
        </div>
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-neutral-950">Yazı içeriği</h2>
        <p className="mt-1 text-xs leading-5 text-neutral-500">
          Ana ara başlık için <strong>##</strong>, alt başlık için <strong>###</strong> kullanabilirsin.
        </p>
        <textarea
          name="body"
          required
          rows={24}
          defaultValue={values.body || ""}
          className={`${input} min-h-[520px] font-mono leading-7`}
        />
      </section>

      <section className="rounded-3xl border border-black/[0.06] bg-white p-5 shadow-sm sm:p-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">SEO</p>
          <h2 className="mt-1 text-lg font-black text-neutral-950">Arama görünümü</h2>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-medium">
            SEO başlığı
            <input name="seoTitle" defaultValue={values.seoTitle || ""} className={input} />
          </label>
          <label className="text-sm font-medium">
            Meta açıklama
            <textarea name="seoDescription" rows={3} defaultValue={values.seoDescription || ""} className={input} />
          </label>
          <label className="text-sm font-medium">
            Canonical URL
            <input name="canonicalUrl" type="url" defaultValue={values.canonicalUrl || ""} className={input} />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-medium">
            <input type="checkbox" name="noIndex" defaultChecked={values.noIndex} />
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
