import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İstanbul İlçeleri", description: "İstanbul ilanlarını 39 ilçe arasından seçerek keşfedin.", alternates: { canonical: absoluteUrl("/ilceler") } };
export default async function DistrictsPage() { const districts = await prisma.district.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }); return <PublicLayout><main className="mx-auto max-w-7xl px-4 py-12 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">Bölgesel keşif</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">İstanbul ilçeleri</h1><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{districts.map(d => <Link key={d.id} href={`/ilce/${d.slug}`} className="rounded-3xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:border-neutral-950 hover:shadow-lg"><h2 className="text-xl font-black">{d.name}</h2><p className="mt-2 text-sm text-neutral-500">{d.shortDescription || `${d.name} bölgesindeki güncel ilanları görüntüleyin.`}</p><p className="mt-5 text-xs font-black uppercase tracking-wider text-fuchsia-600">{d._count.products} ilan</p></Link>)}</div></main></PublicLayout>; }
