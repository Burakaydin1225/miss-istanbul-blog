import Link from "next/link";

import { ContentStatus, ContentType } from "@/lib/content-enums";
import { contentStatusLabel } from "@/lib/content";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const statusClass: Record<ContentStatus, string> = {
  [ContentStatus.DRAFT]: "bg-amber-50 text-amber-700",
  [ContentStatus.PUBLISHED]: "bg-emerald-50 text-emerald-700",
  [ContentStatus.ARCHIVED]: "bg-neutral-100 text-neutral-600",
};

export default async function ContentsPage() {
  const posts = await prisma.contentPost.findMany({
    where: { type: ContentType.BLOG },
    orderBy: [{ updatedAt: "desc" }],
  });

  const published = posts.filter((post) => post.status === ContentStatus.PUBLISHED).length;
  const drafts = posts.filter((post) => post.status === ContentStatus.DRAFT).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">İçerik Merkezi</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">Blog yazıları</h1>
          <p className="mt-2 text-sm text-neutral-500">Miss İstanbul blog içeriklerini tek yerden yönet.</p>
        </div>
        <Link href="/panel/icerikler/yeni" className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white shadow-sm">
          + Yeni yazı
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"><p className="text-xs font-bold text-neutral-400">Toplam</p><p className="mt-2 text-2xl font-black">{posts.length}</p></div>
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"><p className="text-xs font-bold text-neutral-400">Yayında</p><p className="mt-2 text-2xl font-black">{published}</p></div>
        <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm"><p className="text-xs font-bold text-neutral-400">Taslak</p><p className="mt-2 text-2xl font-black">{drafts}</p></div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
        {posts.length ? (
          <div className="divide-y divide-neutral-100">
            {posts.map((post) => (
              <div key={post.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass[post.status]}`}>
                      {contentStatusLabel(post.status)}
                    </span>
                    {post.noIndex ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-black text-red-600">NOINDEX</span> : null}
                  </div>
                  <h2 className="mt-2 truncate font-bold text-neutral-950">{post.title}</h2>
                  <p className="mt-1 truncate text-xs text-neutral-400">/blog/{post.slug}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link target="_blank" href={`/blog/${post.slug}`} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-600">
                    Görüntüle
                  </Link>
                  <Link href={`/panel/icerikler/${post.id}`} className="rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">
                    Düzenle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-neutral-700">Henüz blog yazısı yok.</p>
            <Link href="/panel/icerikler/yeni" className="mt-3 inline-flex text-sm font-bold text-amber-700">İlk yazıyı oluştur →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
