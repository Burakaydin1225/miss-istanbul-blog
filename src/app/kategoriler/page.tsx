import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İlan Kategorileri", description: "Miss İstanbul ilan kategorilerini keşfedin.", alternates: { canonical: absoluteUrl("/kategoriler") } };
export default async function CategoriesPage() { const categories = await prisma.listingCategory.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }); return <PublicLayout><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">Keşfet</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">İlan kategorileri</h1><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{categories.map(c => <Link key={c.id} href={`/kategori/${c.slug}`} className="rounded-3xl bg-neutral-950 p-7 text-white transition hover:bg-fuchsia-600"><h2 className="text-2xl font-black">{c.name}</h2><p className="mt-3 text-sm leading-6 text-neutral-300">{c.shortDescription || c.description || `${c.name} kategorisindeki ilanları görüntüleyin.`}</p><p className="mt-6 text-xs font-black">{c._count.products} ilan →</p></Link>)}</div></main></PublicLayout>; }
