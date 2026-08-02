"use server";

import { revalidatePath } from "next/cache";
import { Prisma, UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import prisma from "@/lib/prisma";

export type DistrictFormState = { error?: string; success?: string };

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
};

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseDistrict(formData: FormData) {
  const name = text(formData, "name");
  const slug = slugify(text(formData, "slug") || name);
  if (name.length < 2) throw new Error("İlçe adı en az 2 karakter olmalı.");
  if (!slug) throw new Error("Geçerli bir slug oluşturulamadı.");
  const sortOrder = Number(text(formData, "sortOrder") || 0);
  return {
    name,
    slug,
    shortDescription: text(formData, "shortDescription") || null,
    description: text(formData, "description") || null,
    coverImage: text(formData, "coverImage") || null,
    seoTitle: text(formData, "seoTitle") || null,
    seoDescription: text(formData, "seoDescription") || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get("isActive") === "on",
  };
}

export async function createDistrictAction(_state: DistrictFormState, formData: FormData): Promise<DistrictFormState> {
  const actor = await requireRole([UserRole.ADMIN]);
  try {
    const district = await prisma.district.create({ data: parseDistrict(formData) });
    await writeAuditLog({ actor, action: "CREATE", entityType: "District", entityId: district.id, description: `${district.name} ilçesi oluşturuldu.` });
    revalidatePath("/panel/ilceler"); revalidatePath("/ilceler"); revalidatePath("/sitemap.xml");
    return { success: "İlçe oluşturuldu." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Bu ilçe adı veya slug zaten kullanılıyor." };
    return { error: error instanceof Error ? error.message : "İlçe oluşturulamadı." };
  }
}

export async function updateDistrictAction(id: string, _state: DistrictFormState, formData: FormData): Promise<DistrictFormState> {
  const actor = await requireRole([UserRole.ADMIN]);
  try {
    const district = await prisma.district.update({ where: { id }, data: parseDistrict(formData) });
    await writeAuditLog({ actor, action: "UPDATE", entityType: "District", entityId: id, description: `${district.name} ilçesi güncellendi.` });
    revalidatePath("/panel/ilceler"); revalidatePath("/ilceler"); revalidatePath(`/ilce/${district.slug}`); revalidatePath("/sitemap.xml");
    return { success: "İlçe kaydedildi." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Bu slug başka bir ilçede kullanılıyor." };
    return { error: error instanceof Error ? error.message : "İlçe güncellenemedi." };
  }
}

export async function deleteDistrictAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  const district = await prisma.district.findUnique({ where: { id }, include: { _count: { select: { products: true, contents: true, neighborhoods: true, placements: true } } } });
  if (!district) throw new Error("İlçe bulunamadı.");
  const dependencies = district._count.products + district._count.contents + district._count.neighborhoods + district._count.placements;
  if (dependencies > 0) throw new Error("Bu ilçeye bağlı ilan, içerik, mahalle veya reklam konumu olduğu için silinemez. Önce pasif hale getirin.");
  await prisma.district.delete({ where: { id } });
  await writeAuditLog({ actor, action: "DELETE", entityType: "District", entityId: id, description: `${district.name} ilçesi silindi.` });
  revalidatePath("/panel/ilceler"); revalidatePath("/ilceler"); revalidatePath("/sitemap.xml");
}
