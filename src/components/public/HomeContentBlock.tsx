import Image from "next/image";
import Link from "next/link";
import type { ContentType } from "@/lib/content-enums";
import { contentPath, contentTypeLabel } from "@/lib/content";

type Props = {
  post: {
    title: string;
    slug: string;
    excerpt: string | null;
    coverImage: string | null;
    type: ContentType;
    district?: { name: string } | null;
  };
};

export function HomeContentBlock({ post }: Props) {
  return (
    <article className="overflow-hidden rounded-[28px] border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-white">
      <Link href={contentPath(post.type, post.slug)} className="grid md:grid-cols-[1fr_280px]">
        <div className="p-7 sm:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[.16em] text-fuchsia-700">
            <span>{contentTypeLabel(post.type)}</span>
            {post.district ? <><span>•</span><span>{post.district.name}</span></> : null}
          </div>
          <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-[-.05em] text-neutral-950 sm:text-4xl">
            {post.title}
          </h2>
          {post.excerpt ? <p className="mt-5 max-w-3xl text-sm leading-7 text-neutral-600 sm:text-base">{post.excerpt}</p> : null}
          <span className="mt-6 inline-flex text-sm font-black text-fuchsia-700">İçeriğin devamını oku →</span>
        </div>
        <div className="relative min-h-56 bg-neutral-100 md:min-h-full">
          {post.coverImage ? (
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 280px" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-black text-neutral-300">Miss İstanbul</div>
          )}
        </div>
      </Link>
    </article>
  );
}
