import Image from "next/image";
import Link from "next/link";
import { ContentType } from "@/lib/content-enums";
import { contentPath, contentTypeLabel } from "@/lib/content";

type Props = {
  post: { title: string; slug: string; excerpt: string | null; coverImage: string | null; type: ContentType; publishedAt: Date | null; district?: { name: string } | null };
};

export function ContentCard({ post }: Props) {
  return (
    <article className="overflow-hidden rounded-3xl border border-black/[0.07] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={contentPath(post.type, post.slug)} className="block">
        <div className="relative aspect-[16/9] bg-neutral-100">
          {post.coverImage ? <Image src={post.coverImage} alt={post.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-neutral-400">Miss İstanbul</div>}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-fuchsia-600">
            <span>{contentTypeLabel(post.type)}</span>
            {post.district ? <><span>•</span><span>{post.district.name}</span></> : null}
          </div>
          <h2 className="mt-3 text-xl font-black tracking-[-.035em] text-neutral-950">{post.title}</h2>
          {post.excerpt ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-neutral-600">{post.excerpt}</p> : null}
        </div>
      </Link>
    </article>
  );
}
