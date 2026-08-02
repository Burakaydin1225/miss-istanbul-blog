import Image from "next/image";
import Link from "next/link";
import type { PublicListing } from "@/lib/public-listings";
import { listingLocation } from "@/lib/public-listings";

export function ListingCard({ listing }: { listing: PublicListing }) {
  const location = listingLocation(listing);
  return (
    <article className="group overflow-hidden rounded-[24px] border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/ilan/${listing.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
          <Image
            src={listing.coverImage}
            alt={listing.coverImageAlt || listing.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
          <div className="absolute left-3 top-3 flex gap-2">
            <span className="rounded-full bg-black/80 px-3 py-1 text-[10px] font-black tracking-wide text-white backdrop-blur">
              {listing.category}
            </span>
            {listing.featuredOnHome || listing.featuredOnListings ? (
              <span className="rounded-full bg-fuchsia-500 px-3 py-1 text-[10px] font-black text-white">ÖNE ÇIKAN</span>
            ) : null}
          </div>
        </div>
        <div className="p-4">
          <h2 className="truncate text-base font-black tracking-[-0.02em]">{listing.name}</h2>
          {location ? <p className="mt-1 truncate text-xs font-semibold text-neutral-500">{location}</p> : null}
          {listing.shortDescription ? (
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-neutral-600">{listing.shortDescription}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
