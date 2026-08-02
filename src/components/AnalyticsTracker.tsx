"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import {
  hasTrackedSessionEvent,
  isPublicAnalyticsPath,
  trackAnalyticsEvent,
  type PublicAnalyticsEventType,
} from "@/lib/analytics-client";

type AnalyticsTrackerProps = {
  eventType: Extract<
    PublicAnalyticsEventType,
    "PAGE_VIEW" | "PRODUCT_VIEW"
  >;
  productId?: string;
  heartbeat?: boolean;
};

export function AnalyticsTracker({
  eventType,
  productId,
  heartbeat = true,
}: AnalyticsTrackerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (
      !pathname ||
      !isPublicAnalyticsPath(pathname)
    ) {
      return;
    }

    const uniqueEventKey = [
      eventType,
      pathname,
      productId || "general",
    ].join(":");

    const alreadyTracked =
      hasTrackedSessionEvent(uniqueEventKey);

    if (!alreadyTracked) {
      void trackAnalyticsEvent({
        eventType,
        path: pathname,
        productId,
      });
    }

    if (!heartbeat) {
      return;
    }

    const sendHeartbeat = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void trackAnalyticsEvent({
        eventType: "HEARTBEAT",
        path: pathname,
      });
    };

    const intervalId = window.setInterval(
      sendHeartbeat,
      30_000,
    );

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendHeartbeat();
      }
    };

    const handleFocus = () => {
      sendHeartbeat();
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      window.clearInterval(intervalId);

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [
    eventType,
    heartbeat,
    pathname,
    productId,
  ]);

  return null;
}