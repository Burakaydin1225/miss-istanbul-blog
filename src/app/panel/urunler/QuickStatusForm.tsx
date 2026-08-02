"use client";

import { quickUpdateProductStatusAction } from "@/app/panel/urunler/actions";

export function QuickStatusForm({ productId, status }: { productId: string; status: string }) {
  const action = quickUpdateProductStatusAction.bind(null, productId);

  return (
    <form action={action}>
      <select
        name="status"
        defaultValue={status}
        aria-label="İlan yayın durumunu değiştir"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-9 rounded-xl border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 outline-none focus:border-neutral-500"
      >
        <option value="DRAFT">Taslak</option>
        <option value="PUBLISHED">Yayında</option>
        <option value="PAUSED">Durduruldu</option>
        <option value="ARCHIVED">Arşiv</option>
      </select>
    </form>
  );
}
