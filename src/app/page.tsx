import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ContentType } from "@/generated/prisma/client";
import { HomeBlogFeed } from "@/components/blog/HomeBlogFeed";
import { PublicLayout } from "@/components/public/PublicLayout";
import prisma from "@/lib/prisma";
import { siteConfig } from "@/lib/site-config";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export const metadata: Metadata = {
  title: { absolute: siteConfig.homeTitle },
  description: siteConfig.description,
  alternates: { canonical: siteConfig.url },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    title: siteConfig.homeTitle,
    description: siteConfig.description,
  },
};

type HomePageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isFinite(parsedPage) ? Math.max(1, Math.floor(parsedPage)) : 1;
  const now = new Date();
  const publishedWhere = {
    status: "PUBLISHED" as const,
    noIndex: false,
    publishedAt: { lte: now },
  };

  const totalPosts = await prisma.contentPost.count({
    where: { ...publishedWhere, type: ContentType.BLOG },
  });
  const totalPages = Math.max(1, Math.ceil(totalPosts / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const [posts, recentPosts, guides] = await Promise.all([
    prisma.contentPost.findMany({
      where: { ...publishedWhere, type: ContentType.BLOG },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        publishedAt: true,
        createdAt: true,
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.contentPost.findMany({
      where: { ...publishedWhere, type: ContentType.BLOG },
      select: { id: true, title: true, slug: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 10,
    }),
    prisma.contentPost.findMany({
      where: { ...publishedWhere, type: ContentType.GUIDE },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const serializedPosts = posts.map((post) => ({
    ...post,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
  }));

  return (
    <PublicLayout>
      <main>
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-[1120px] px-4 py-9 sm:px-6 sm:py-11">
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-.025em] text-sky-700 sm:text-[38px]">
              {siteConfig.homeTitle}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-neutral-600">
              {siteConfig.homeIntro}
            </p>
          </div>
        </section>

        <div className="mx-auto grid max-w-[1120px] gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
          <section className="border border-neutral-200 bg-white px-5 py-7 shadow-sm sm:px-7">
            {serializedPosts.length ? (
              <HomeBlogFeed initialPosts={serializedPosts} initialPage={safePage} totalPages={totalPages} />
            ) : (
              <div className="py-16 text-center">
                <h2 className="text-xl font-semibold text-neutral-800">Henüz yayınlanmış blog yazısı bulunmuyor.</h2>
                <p className="mt-2 text-sm text-neutral-500">Yeni yazılar yayınlandığında burada listelenecek.</p>
              </div>
            )}
          </section>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <SidebarBox title="Son Yazılar">
              <ul className="space-y-2.5">
                {recentPosts.map((post) => (
                  <li key={post.id} className="border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
                    <Link href={`/blog/${post.slug}`} className="text-sm leading-6 text-sky-700 transition hover:text-sky-900 hover:underline">
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </SidebarBox>

            <SidebarBox title="Şehir Rehberi">
              {guides.length ? (
                <ul className="space-y-2.5">
                  {guides.map((guide) => (
                    <li key={guide.id} className="border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
                      <Link href={`/rehber/${guide.slug}`} className="text-sm leading-6 text-sky-700 transition hover:text-sky-900 hover:underline">
                        {guide.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm leading-6 text-neutral-500">Henüz yayınlanmış rehber bulunmuyor.</p>
              )}
            </SidebarBox>

            <SidebarBox title="Reklam Ver">
              <p className="text-sm leading-6 text-neutral-600">Blog ve rehber sayfalarında görünür olmak için bizimle iletişime geç.</p>
              <Link href="/reklam-ver" className="mt-4 inline-flex bg-[#ff4935] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e53b29]">
                İletişime geç
              </Link>
            </SidebarBox>
          </aside>
        </div>
      </main>
    </PublicLayout>
  );
}

function SidebarBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-neutral-200 bg-white shadow-sm">
      <h2 className="border-b-4 border-[#ff4935] bg-neutral-800 px-5 py-3 text-base font-bold text-white">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}
