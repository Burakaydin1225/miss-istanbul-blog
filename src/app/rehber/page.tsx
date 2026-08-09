import type { Metadata } from "next";
import { ContentType } from "@/lib/content-enums";
import { ContentCard } from "@/components/content/ContentCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "İstanbul Rehberi", description: "İstanbul ilçeleri, ulaşım ve şehir yaşamı için kalıcı rehber içerikleri.", alternates: { canonical: absoluteUrl("/rehber") } };
export default async function GuidePage() {
  const posts = await prisma.contentPost.findMany({ where: { type: ContentType.GUIDE, status: "PUBLISHED", noIndex: false, publishedAt: { lte: new Date() } }, include: { district: { select: { name: true } } }, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] });
  return <PublicLayout><main className="mx-auto max-w-6xl px-4 py-14 sm:px-6"><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">İstanbul Bilgi Merkezi</p><h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Rehber</h1><p className="mt-4 max-w-2xl text-neutral-600">İlçeler, semtler, ulaşım ve İstanbul yaşamı hakkında kapsamlı rehberler.</p>{posts.length ? <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{posts.map(post => <ContentCard key={post.id} post={post} />)}</div> : <div className="mt-10 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Henüz yayınlanmış rehber içeriği bulunmuyor.</div>}</main></PublicLayout>;
}
