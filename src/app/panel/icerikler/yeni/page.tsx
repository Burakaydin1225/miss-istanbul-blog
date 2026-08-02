import Link from "next/link";
import { ContentForm } from "../ContentForm";
import { createContentAction } from "../actions";
import prisma from "@/lib/prisma";
export default async function NewContentPage() {
  const [districts, categories] = await Promise.all([prisma.district.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.listingCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  return <div className="max-w-4xl"><Link href="/panel/icerikler" className="text-sm font-medium text-neutral-500">← İçeriklere dön</Link><h1 className="mt-4 text-2xl font-bold">Yeni içerik</h1><div className="mt-6"><ContentForm action={createContentAction} districts={districts} categories={categories} submitLabel="İçeriği oluştur" /></div></div>;
}
