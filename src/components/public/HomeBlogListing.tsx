import Image from "next/image";
import Link from "next/link";
import type { PublicListing } from "@/lib/public-listings";
import { listingLocation } from "@/lib/public-listings";

type Props = {
  listing: PublicListing;
  premium?: boolean;
};

export function HomeBlogListing({ listing, premium = false }: Props) {
  const location = listingLocation(listing);
  const category = listing.listingCategory?.name ?? listing.category;

  return (
    <article className="border-b border-neutral-200 py-7 first:pt-0 last:border-b-0 last:pb-0">
      <h2 className="text-[25px] font-semibold leading-tight tracking-[-.025em] text-neutral-800 sm:text-[29px]">
        <Link href={`/ilan/${listing.slug}`} className="transition hover:text-sky-700">
          {listing.name}
        </Link>
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
        <time dateTime={listing.createdAt.toISOString()}>
          {new Intl.DateTimeFormat("tr-TR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }).format(listing.createdAt)}
        </time>
        {location ? <><span>•</span><span>{location}</span></> : null}
        {premium ? <><span>•</span><span className="font-bold text-amber-700">Premium ilan</span></> : null}
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Link
          href={`/ilan/${listing.slug}`}
          className="relative block aspect-[4/5] overflow-hidden border border-neutral-300 bg-neutral-100 sm:aspect-auto sm:h-[225px]"
        >
          <Image
            src={listing.coverImage}
            alt={listing.coverImageAlt || listing.name}
            fill
            sizes="(max-width: 640px) 100vw, 180px"
            className="object-cover transition duration-300 hover:scale-[1.025]"
          />
        </Link>

        <div className="flex min-w-0 flex-col">
          <p className="text-[15px] leading-7 text-neutral-700">
            {listing.shortDescription || "İlanın ayrıntılarını, görsellerini ve iletişim seçeneklerini görüntülemek için devam edin."}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500">
            {location ? <Link href={listing.district ? `/ilce/${listing.district.slug}` : "/ilceler"} className="hover:text-sky-700">▣ {location}</Link> : null}
            {category ? <Link href={listing.listingCategory ? `/kategori/${listing.listingCategory.slug}` : "/kategoriler"} className="hover:text-sky-700">◆ {category}</Link> : null}
          </div>

          <div className="mt-auto pt-5 text-right">
            <Link
              href={`/ilan/${listing.slug}`}
              className="inline-flex items-center rounded-sm bg-[#ff4935] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e53b29]"
            >
              Devamını oku »
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
