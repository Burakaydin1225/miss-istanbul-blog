"use client";

import { useActionState } from "react";
import { createDistrictAction, updateDistrictAction, type DistrictFormState } from "./actions";

type District = { id: string; name: string; slug: string; shortDescription: string | null; description: string | null; coverImage: string | null; seoTitle: string | null; seoDescription: string | null; sortOrder: number; isActive: boolean; _count?: { products: number; contents: number; neighborhoods: number; placements: number } };
const initialState: DistrictFormState = {};
const input = "mt-2 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

function Fields({ district }: { district?: District }) {
  return <>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">İlçe adı<input name="name" defaultValue={district?.name} className={input} required /></label><label className="text-sm font-medium">Slug<input name="slug" defaultValue={district?.slug} className={input} placeholder="otomatik oluşturulur" /></label></div>
    <label className="text-sm font-medium">Kısa açıklama<textarea name="shortDescription" defaultValue={district?.shortDescription ?? ""} className={input} rows={2} /></label>
    <label className="text-sm font-medium">Detaylı açıklama<textarea name="description" defaultValue={district?.description ?? ""} className={input} rows={4} /></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Kapak görseli URL<input name="coverImage" defaultValue={district?.coverImage ?? ""} className={input} /></label><label className="text-sm font-medium">Sıra<input name="sortOrder" type="number" defaultValue={district?.sortOrder ?? 0} className={input} /></label></div>
    <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">SEO başlığı<input name="seoTitle" defaultValue={district?.seoTitle ?? ""} className={input} /></label><label className="text-sm font-medium">SEO açıklaması<input name="seoDescription" defaultValue={district?.seoDescription ?? ""} className={input} /></label></div>
    <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={district?.isActive ?? true} /> Aktif</label>
  </>;
}

export function CreateDistrictForm() {
  const [state, action, pending] = useActionState(createDistrictAction, initialState);
  return <form action={action} className="space-y-4 rounded-2xl border border-black/[0.06] bg-white p-5"><h2 className="text-lg font-semibold">Yeni ilçe</h2><Fields />{state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.success && <p className="text-sm text-emerald-600">{state.success}</p>}<button disabled={pending} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Kaydediliyor..." : "İlçe ekle"}</button></form>;
}

export function EditDistrictForm({ district }: { district: District }) {
  const actionWithId = updateDistrictAction.bind(null, district.id);
  const [state, action, pending] = useActionState(actionWithId, initialState);
  const count = district._count ? Object.values(district._count).reduce((a, b) => a + b, 0) : 0;
  return <details className="rounded-2xl border border-black/[0.06] bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5"><div><p className="font-semibold">{district.name}</p><p className="mt-1 text-xs text-neutral-500">/{district.slug} · {district.isActive ? "Aktif" : "Pasif"} · {count} bağlı kayıt</p></div><span className="text-sm text-neutral-500">Düzenle</span></summary><form action={action} className="space-y-4 border-t border-neutral-100 p-5"><Fields district={district} />{state.error && <p className="text-sm text-red-600">{state.error}</p>}{state.success && <p className="text-sm text-emerald-600">{state.success}</p>}<button disabled={pending} className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Kaydet</button></form></details>;
}
