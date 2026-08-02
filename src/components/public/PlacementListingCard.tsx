"use client";

import { useEffect, useRef } from "react";

import type { PublicListing } from "@/lib/public-listings";
import {
  hasTrackedSessionEvent,
  trackAnalyticsEvent,
} from "@/lib/analytics-client";

import { ListingCard } from "./ListingCard";

type PlacementListingCardProps = {
  listing: PublicListing;
  placementId: string;
  placementType: string;
  position: number;
};

export function PlacementListingCard({
  listing,
  placementId,
  placementType,
  position,
}: PlacementListingCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let visibleTimer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          visibleTimer = window.setTimeout(() => {
            const key = `placement-impression:${placementId}`;
            if (!hasTrackedSessionEvent(key)) {
              void trackAnalyticsEvent({
                eventType: "PLACEMENT_IMPRESSION",
                productId: listing.id,
                placementId,
                metadata: { placementType, position },
              });
            }
          }, 800);
        } else if (visibleTimer) {
          window.clearTimeout(visibleTimer);
          visibleTimer = undefined;
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(element);
    return () => {
      if (visibleTimer) window.clearTimeout(visibleTimer);
      observer.disconnect();
    };
  }, [listing.id, placementId, placementType, position]);

  const handleClick = () => {
    void trackAnalyticsEvent({
      eventType: "PLACEMENT_CLICK",
      productId: listing.id,
      placementId,
      metadata: { placementType, position },
    });
  };

  return (
    <div ref={containerRef} onClickCapture={handleClick}>
      <ListingCard listing={listing} />
    </div>
  );
}
