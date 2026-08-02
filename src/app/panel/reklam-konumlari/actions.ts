"use server";

import { revalidatePath } from "next/cache";
import { PlacementType, UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export type PlacementFormState = { error?: string; success?: string };
const text = (fd: FormData, key: string) => typeof fd.get(key) === "string" ? String(fd.get(key)).trim() : "";
const nullable = (v: string) => v || null;
function parseDate(value: string) { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; }

function validateScope(type: PlacementType, districtId: string | null, categoryId: string | null) {
  if ((type === PlacementType.DISTRICT_TOP || type === PlacementType.DISTRICT_CATEGORY_TOP) && !districtId) throw new Error("Bu konum türü için ilçe seçmelisiniz.");
  if ((type === PlacementType.CATEGORY_TOP || type === PlacementType.DISTRICT_CATEGORY_TOP) && !categoryId) throw new Error("Bu konum türü için kategori seçmelisiniz.");
}

export async function createPlacementAction(_: PlacementFormState, fd: FormData): Promise<PlacementFormState> {
  const actor = await requireRole([UserRole.ADMIN]);
  try {
    const productId = text(fd, "productId");
    const typeRaw = text(fd, "type");
    if (!productId) throw new Error("Bir ilan seçmelisiniz.");
    if (!Object.values(PlacementType).includes(typeRaw as PlacementType)) throw new Error("Geçersiz reklam konumu türü.");
    const type = typeRaw as PlacementType;
    const districtId = nullable(text(fd, "districtId"));
    const categoryId = nullable(text(fd, "categoryId"));
    validateScope(type, districtId, categoryId);
    const startsAt = parseDate(text(fd, "startsAt"));
    const expiresAt = parseDate(text(fd, "expiresAt"));
    if (!startsAt || !expiresAt) throw new Error("Başlangıç ve bitiş tarihleri zorunludur.");
    if (expiresAt <= startsAt) throw new Error("Bitiş tarihi başlangıç tarihinden sonra olmalı.");
    const position = Math.max(1, Number(text(fd, "position") || 1));

    const conflict = await prisma.placement.findFirst({
      where: {
        type,
        districtId,
        categoryId,
        position,
        isActive: true,
        startsAt: { lt: expiresAt },
        expiresAt: { gt: startsAt },
      },
    });
    if (conflict) throw new Error("Bu konum ve sıra seçilen tarih aralığında dolu.");

    const placement = await prisma.placement.create({ data: { productId, type, districtId, categoryId, position, startsAt, expiresAt, isActive: true, note: nullable(text(fd, "note")) }, include: { product: true } });
    await writeAuditLog({ actor, action: "CREATE", entityType: "Placement", entityId: placement.id, description: `${placement.product.name} ilanı için reklam konumu oluşturuldu.` });
    revalidatePath("/panel/reklam-konumlari"); revalidatePath("/"); revalidatePath("/ilanlar");
    return { success: "Reklam konumu oluşturuldu." };
  } catch (error) { return { error: error instanceof Error ? error.message : "Reklam konumu oluşturulamadı." }; }
}

export async function togglePlacementAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  const current = await prisma.placement.findUnique({ where: { id }, include: { product: true } });
  if (!current) throw new Error("Reklam konumu bulunamadı.");
  const updated = await prisma.placement.update({ where: { id }, data: { isActive: !current.isActive } });
  await writeAuditLog({ actor, action: "UPDATE", entityType: "Placement", entityId: id, description: `${current.product.name} reklam konumu ${updated.isActive ? "aktif" : "pasif"} yapıldı.` });
  revalidatePath("/panel/reklam-konumlari"); revalidatePath("/"); revalidatePath("/ilanlar");
}

export async function deletePlacementAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  const item = await prisma.placement.delete({ where: { id }, include: { product: true } });
  await writeAuditLog({ actor, action: "DELETE", entityType: "Placement", entityId: id, description: `${item.product.name} reklam konumu silindi.` });
  revalidatePath("/panel/reklam-konumlari"); revalidatePath("/"); revalidatePath("/ilanlar");
}
