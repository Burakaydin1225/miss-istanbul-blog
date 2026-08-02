"use client";
import { useActionState } from "react";
import type { ContentStatus, ContentType } from "@/generated/prisma/client";
import type { ContentFormState } from "./actions";

type Option = { id: string; name: string };
type Values = { title?: string; slug?: string; excerpt?: string | null; body?: string; type?: ContentType; status?: ContentStatus; coverImage?: string | null; districtId?: string | null; categoryId?: string | null; seoTitle?: string | null; seoDescription?: string | null; canonicalUrl?: string | null; noIndex?: boolean; publishedAt?: Date | null };
type Props = { action: (state: ContentFormState, formData: FormData) => Promise<ContentFormState>; values?: Values; districts: Option[]; categories: Option[]; submitLabel: string };
const input = "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none focus:border-neutral-950";
export function ContentForm({ action, values = {}, districts, categories, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const dateValue = values.publishedAt ? new Date(values.publishedAt.getTime() - values.publishedAt.getTimezoneOffset() * 60000).toISOString().slice(0,16) : "";
  return <form action={formAction} className="space-y-6">
    {state.error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</p> : null}
    {state.success ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{state.success}</p> : null}
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5"><h2 className="font-bold">Temel bilgiler</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
      <label className="text-sm font-medium">İçerik türü<select name="type" defaultValue={values.type || "GUIDE"} className={input}><option value="GUIDE">Rehber</option><option value="BLOG">Blog</option></select></label>
      <label className="text-sm font-medium">Durum<select name="status" defaultValue={values.status || "DRAFT"} className={input}><option value="DRAFT">Taslak</option><option value="PUBLISHED">Yayında</option><option value="ARCHIVED">Arşiv</option></select></label>
      <label className="text-sm font-medium md:col-span-2">Başlık<input name="title" required defaultValue={values.title || ""} className={input} /></label>
      <label className="text-sm font-medium">Slug<input name="slug" defaultValue={values.slug || ""} placeholder="Boş bırakılırsa başlıktan oluşur" className={input} /></label>
      <label className="text-sm font-medium">Yayın tarihi<input type="datetime-local" name="publishedAt" defaultValue={dateValue} className={input} /></label>
      <label className="text-sm font-medium md:col-span-2">Kısa açıklama<textarea name="excerpt" rows={3} defaultValue={values.excerpt || ""} className={input} /></label>
      <label className="text-sm font-medium md:col-span-2">Kapak görseli URL<input name="coverImage" type="url" defaultValue={values.coverImage || ""} className={input} /></label>
      <label className="text-sm font-medium">İlçe<select name="districtId" defaultValue={values.districtId || ""} className={input}><option value="">İlçe bağlantısı yok</option>{districts.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="text-sm font-medium">Kategori<select name="categoryId" defaultValue={values.categoryId || ""} className={input}><option value="">Kategori bağlantısı yok</option>{categories.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    </div></section>
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5"><h2 className="font-bold">İçerik</h2><p className="mt-1 text-xs text-neutral-500">Ara başlık için satırın başına ## yazabilirsin.</p><textarea name="body" required rows={20} defaultValue={values.body || ""} className={`${input} font-mono leading-7`} /></section>
    <section className="rounded-2xl border border-black/[0.06] bg-white p-5"><h2 className="font-bold">SEO ayarları</h2><div className="mt-4 grid gap-4">
      <label className="text-sm font-medium">SEO başlığı<input name="seoTitle" defaultValue={values.seoTitle || ""} className={input} /></label>
      <label className="text-sm font-medium">Meta açıklama<textarea name="seoDescription" rows={3} defaultValue={values.seoDescription || ""} className={input} /></label>
      <label className="text-sm font-medium">Canonical URL<input name="canonicalUrl" type="url" defaultValue={values.canonicalUrl || ""} className={input} /></label>
      <label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" name="noIndex" defaultChecked={values.noIndex} /> Arama motorlarında indeksleme</label>
    </div></section>
    <button disabled={pending} className="rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? "Kaydediliyor..." : submitLabel}</button>
  </form>;
}
