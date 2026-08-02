"use client";

import { useEffect, useState, useTransition } from "react";

import { bulkUpdateProductsAction } from "@/app/panel/urunler/actions";

const CHECKBOX_SELECTOR = 'input[name="productIds"]';

function getCheckboxes(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(CHECKBOX_SELECTOR));
}

export function BulkSelectionControls({ canEdit }: { canEdit: boolean }) {
  const [selectedCount, setSelectedCount] = useState(0);
  const [allSelected, setAllSelected] = useState(false);
  const [operation, setOperation] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const updateSelection = () => {
      const checkboxes = getCheckboxes();
      const checked = checkboxes.filter((checkbox) => checkbox.checked).length;
      setSelectedCount(checked);
      setAllSelected(checkboxes.length > 0 && checked === checkboxes.length);
    };

    document.addEventListener("change", updateSelection);
    updateSelection();
    return () => document.removeEventListener("change", updateSelection);
  }, []);

  const toggleAll = () => {
    const checkboxes = getCheckboxes();
    const nextValue = !allSelected;
    for (const checkbox of checkboxes) checkbox.checked = nextValue;
    setAllSelected(nextValue);
    setSelectedCount(nextValue ? checkboxes.length : 0);
  };

  const submitBulkOperation = () => {
    if (!operation) return;
    const selectedIds = getCheckboxes().filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value);
    if (selectedIds.length === 0) return;

    const formData = new FormData();
    formData.set("bulkOperation", operation);
    for (const productId of selectedIds) formData.append("productIds", productId);

    startTransition(async () => {
      await bulkUpdateProductsAction(formData);
      for (const checkbox of getCheckboxes()) checkbox.checked = false;
      setSelectedCount(0);
      setAllSelected(false);
      setOperation("");
    });
  };

  if (!canEdit) return null;

  return (
    <div className="sticky bottom-4 z-20 mt-4 flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:items-center">
      <button type="button" onClick={toggleAll} className="h-10 rounded-xl border border-neutral-200 px-4 text-xs font-semibold text-neutral-700">
        {allSelected ? "Seçimi kaldır" : "Sayfadakileri seç"}
      </button>

      <p className="min-w-[110px] text-xs font-semibold text-neutral-600">{selectedCount} ilan seçildi</p>

      <select value={operation} onChange={(event) => setOperation(event.target.value)} className="h-10 min-w-0 rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700 sm:min-w-[210px]">
        <option value="" disabled>Toplu işlem seç</option>
        <option value="STATUS_PUBLISHED">Yayına al</option>
        <option value="STATUS_DRAFT">Taslağa taşı</option>
        <option value="STATUS_PAUSED">Durdur</option>
        <option value="STATUS_ARCHIVED">Arşivle</option>
        <option value="ACTIVATE">Aktif yap</option>
        <option value="DEACTIVATE">Pasif yap</option>
        <option value="TIER_VIP">VIP yap</option>
        <option value="TIER_PREMIUM">Premium yap</option>
        <option value="TIER_GOLD">Gold yap</option>
      </select>

      <button
        type="button"
        onClick={submitBulkOperation}
        disabled={selectedCount === 0 || !operation || isPending}
        className="h-10 rounded-xl bg-neutral-950 px-5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {isPending ? "Uygulanıyor..." : "Uygula"}
      </button>
    </div>
  );
}
