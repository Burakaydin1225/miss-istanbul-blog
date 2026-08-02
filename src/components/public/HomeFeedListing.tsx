import Image from "next/image";
import Link from "next/link";
import type { PublicListing } from "@/lib/public-listings";
import { listingLocation } from "@/lib/public-listings";

type Props = {
  listing: PublicListing;
  premium?: boolean;
};

export function HomeFeedListing({ listing, premium = false }: Props) {
  const location = listingLocation(listing);
  const category = listing.listingCategory?.name ?? listing.category;

  return (
    <article
      className={[
        "group overflow-hidden border bg-white transition",
        premium
          ? "rounded-[26px] border-amber-300 shadow-[0_18px_50px_rgba(120,53,15,.10)]"
          : "rounded-[22px] border-neutral-200 shadow-sm hover:border-neutral-300 hover:shadow-lg",
      ].join(" ")}
    >
      <Link href={`/ilan/${listing.slug}`} className="grid sm:grid-cols-[230px_1fr]">
        <div className="relative min-h-64 overflow-hidden bg-neutral-100 sm:min-h-0">
          <Image
            src={listing.coverImage}
            alt={listing.coverImageAlt || listing.name}
            fill
            sizes="(max-width: 640px) 100vw, 230px"
            className="object-cover transition duration-500 group-hover:scale-[1.025]"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            {premium ? (
              <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[.12em] text-amber-950">
                Premium
              </span>
            ) : null}
            <span className="rounded-full bg-black/75 px-3 py-1 text-[10px] font-black text-white backdrop-blur">
              {category}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[.12em] text-neutral-500">
            {location ? <span>{location}</span> : null}
            {listing.cardTag ? <><span>•</span><span>{listing.cardTag}</span></> : null}
          </div>
          <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-.04em] text-neutral-950 sm:text-[28px]">
            {listing.name}
          </h2>
          {listing.shortDescription ? (
            <p className="mt-4 line-clamp-3 text-sm leading-7 text-neutral-600 sm:text-[15px]">
              {listing.shortDescription}
            </p>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-4 pt-6">
            <span className="text-xs font-bold text-neutral-400">
              {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(listing.createdAt)}
            </span>
            <span className="text-sm font-black text-fuchsia-700">İlanı incele →</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
