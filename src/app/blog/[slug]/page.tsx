import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ContentType } from "@/lib/content-enums";
import { ContentBody } from "@/components/content/ContentBody";
import { PublicLayout } from "@/components/public/PublicLayout";
import { contentBody } from "@/lib/content";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

async function getPost(slug: string) {
  return prisma.contentPost.findFirst({
    where: {
      slug,
      type: ContentType.BLOG,
      status: "PUBLISHED",
      publishedAt: {
        lte: new Date(),
      },
    },
    include: {
      district: true,
      category: true,
    },
  });
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) {
    return {};
  }

  const canonical =
    post.canonicalUrl || absoluteUrl(`/blog/${post.slug}`);

  return {
    title: post.seoTitle || post.title,
    description:
      post.seoDescription || post.excerpt || undefined,

    alternates: {
      canonical,
    },

    robots: {
      index: !post.noIndex,
      follow: true,
    },

    openGraph: {
      title: post.seoTitle || post.title,
      description:
        post.seoDescription || post.excerpt || undefined,
      url: canonical,
      type: "article",
      images: post.coverImage
        ? [post.coverImage]
        : undefined,
    },
  };
}

export default async function BlogDetail({
  params,
}: Props) {
  const { slug } = await params;

  const post = await getPost(slug);

  if (!post) {
    notFound();
  }

  const body = contentBody(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description:
      post.excerpt ||
      post.seoDescription ||
      undefined,
    image:
      post.coverImage ||
      undefined,
    datePublished:
      post.publishedAt?.toISOString(),
    dateModified:
      post.updatedAt.toISOString(),
    mainEntityOfPage:
      absoluteUrl(`/blog/${post.slug}`),
    publisher: {
      "@type": "Organization",
      name: "Miss İstanbul",
    },
  };

  const showBeylikduzuResource =
    post.district?.name
      ?.toLocaleLowerCase("tr-TR")
      .includes("beylikdüzü") ?? false;

  return (
    <PublicLayout>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd),
          }}
        />

        <nav className="text-sm text-neutral-500">
          <Link
            href="/blog"
            className="hover:text-neutral-950"
          >
            Blog
          </Link>

          <span className="px-2">/</span>

          <span>{post.title}</span>
        </nav>

        {post.coverImage ? (
          <img
            src={post.coverImage}
            alt={post.title}
            className="mt-8 aspect-[16/8] w-full rounded-3xl object-cover"
          />
        ) : null}

        <p className="mt-8 text-xs font-black uppercase tracking-[.16em] text-fuchsia-600">
          Blog
          {post.district
            ? ` • ${post.district.name}`
            : ""}
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-[-.055em] text-neutral-950 sm:text-5xl">
          {post.title}
        </h1>

        {post.excerpt ? (
          <p className="mt-5 text-xl leading-8 text-neutral-600">
            {post.excerpt}
          </p>
        ) : null}

        <div className="my-8 h-px bg-neutral-200" />

        <ContentBody body={body} />

        {showBeylikduzuResource ? (
          <aside className="mt-10 rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
            <p className="text-sm leading-7 text-neutral-700">
              Beylikdüzü bölgesindeki escort ilanları
              incelemek için{" "}
              <a
                href="https://www.beylikduzu25.com/"
                className="font-semibold text-neutral-950 underline underline-offset-4"
              >
                ilgili bölge sayfasını
              </a>{" "}
              ziyaret edebilirsiniz.
            </p>
          </aside>
        ) : null}
      </main>
    </PublicLayout>
  );
}