import type { Metadata } from "next";
import Link from "next/link";
import { ContentType } from "@/generated/prisma/client";
import { ContentCard } from "@/components/content/ContentCard";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: "Blog",
  description: "İstanbul yaşamı, ilçeler ve güncel şehir içerikleri.",
  alternates: { canonical: absoluteUrl("/blog") },
};

type BlogPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const parsedPage = Number(params.page ?? "1");
  const requestedPage = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const now = new Date();
  const where = {
    type: ContentType.BLOG,
    status: "PUBLISHED" as const,
    noIndex: false,
    publishedAt: { lte: now },
  };

  const totalPosts = await prisma.contentPost.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const posts = await prisma.contentPost.findMany({
    where,
    include: { district: { select: { name: true } } },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return (
    <PublicLayout>
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-600">SEO Hub</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-.05em] sm:text-5xl">Blog</h1>
        <p className="mt-4 max-w-2xl text-neutral-600">İstanbul hakkında güncel içerikler, bölge notları ve şehir yaşamından seçkiler.</p>

        {posts.length ? (
          <>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => <ContentCard key={post.id} post={post} />)}
            </div>
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Blog sayfalama">
              {page > 1 ? (
                <Link href={page === 2 ? "/blog" : `/blog?page=${page - 1}`} className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-900">
                  Önceki
                </Link>
              ) : null}

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((item) => (
                <Link
                  key={item}
                  href={item === 1 ? "/blog" : `/blog?page=${item}`}
                  className={item === page ? "rounded-xl bg-neutral-900 px-4 py-2 text-sm font-bold text-white" : "rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-900"}
                >
                  {item}
                </Link>
              ))}

              {page < totalPages ? (
                <Link href={`/blog?page=${page + 1}`} className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-900">
                  Sonraki
                </Link>
              ) : null}
            </nav>
          </>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">Henüz yayınlanmış blog içeriği bulunmuyor.</div>
        )}
      </main>
    </PublicLayout>
  );
}
