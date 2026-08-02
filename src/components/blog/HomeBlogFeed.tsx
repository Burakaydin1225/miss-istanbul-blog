"use client";

import Link from "next/link";
import { useState } from "react";

export type HomeBlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  createdAt: string;
};

type HomeBlogFeedProps = {
  initialPosts: HomeBlogPost[];
  initialPage: number;
  totalPages: number;
};

export function HomeBlogFeed({ initialPosts, initialPage, totalPages }: HomeBlogFeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const hasMore = page < totalPages;

  async function loadMore() {
    if (!hasMore || loading) return;

    setLoading(true);
    setError("");

    try {
      const nextPage = page + 1;
      const response = await fetch(`/api/public/blog-posts?page=${nextPage}`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) throw new Error("Yazılar yüklenemedi.");

      const payload = (await response.json()) as { posts: HomeBlogPost[]; page: number };
      setPosts((current) => [...current, ...payload.posts]);
      setPage(payload.page);

      const url = new URL(window.location.href);
      url.searchParams.set("page", String(payload.page));
      window.history.replaceState({}, "", url);
    } catch {
      setError("Yeni yazılar yüklenirken bir sorun oluştu. Tekrar deneyebilirsin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div>
        {posts.map((post) => (
          <BlogFeedPost key={post.id} post={post} />
        ))}
      </div>

      <div className="mt-8 border-t border-neutral-200 pt-7 text-center">
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="inline-flex min-w-44 items-center justify-center border border-neutral-900 bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Yükleniyor…" : "Daha fazla yazı yükle"}
          </button>
        ) : (
          <p className="text-sm text-neutral-500">Tüm yazıları görüntüledin.</p>
        )}

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500" aria-label="Sayfalama bağlantıları">
          {Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 12).map((item) => (
            <Link
              key={item}
              href={item === 1 ? "/" : `/?page=${item}`}
              className={item === page ? "font-bold text-neutral-950 underline" : "hover:text-neutral-950 hover:underline"}
            >
              {item}
            </Link>
          ))}
          {totalPages > 12 ? <span>…</span> : null}
        </div>
      </div>
    </>
  );
}

function BlogFeedPost({ post }: { post: HomeBlogPost }) {
  const publishedDate = new Date(post.publishedAt ?? post.createdAt);

  return (
    <article className="border-b border-neutral-200 py-7 first:pt-0 last:border-0 last:pb-0">
      <h2 className="text-2xl font-semibold leading-tight tracking-[-.02em] text-neutral-800 sm:text-[28px]">
        <Link href={`/blog/${post.slug}`} className="transition hover:text-sky-700">
          {post.title}
        </Link>
      </h2>
      <p className="mt-2 text-xs text-neutral-500">
        {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(publishedDate)}
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[190px_minmax(0,1fr)]">
        {post.coverImage ? (
          <Link href={`/blog/${post.slug}`} className="block overflow-hidden border border-neutral-200 bg-neutral-100">
            <img
              src={post.coverImage}
              alt={post.title}
              loading="lazy"
              className="aspect-[4/3] h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
            />
          </Link>
        ) : (
          <div className="aspect-[4/3] border border-neutral-200 bg-neutral-100" />
        )}
        <div className="flex min-w-0 flex-col">
          <p className="line-clamp-5 text-sm leading-7 text-neutral-600">
            {post.excerpt || "Yazının devamını okumak için detay sayfasına geçin."}
          </p>
          <div className="mt-auto pt-5 text-right">
            <Link
              href={`/blog/${post.slug}`}
              className="inline-flex bg-[#ff4935] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e53b29]"
            >
              Devamını oku »
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
