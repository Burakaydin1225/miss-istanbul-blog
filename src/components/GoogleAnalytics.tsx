"use client";

import Script from "next/script";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";
import {
  Suspense,
  useEffect,
  useState,
} from "react";

const gaMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

type GtagFunction = (
  command: "config" | "event" | "js",
  targetIdOrEventName: string | Date,
  parameters?: Record<
    string,
    string | number | boolean | null | undefined
  >,
) => void;

function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (
      !gaMeasurementId ||
      !isReady ||
      typeof window === "undefined"
    ) {
      return;
    }

    const gtag = (window as Window & {
      gtag?: GtagFunction;
    }).gtag;

    if (typeof gtag !== "function") {
      return;
    }

    const query = searchParams.toString();

    const pagePath = query
      ? `${pathname}?${query}`
      : pathname;

    gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams, isReady]);

  if (!gaMeasurementId) {
    return null;
  }

  return (
    <>
      <Script
        id="google-analytics-script"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}`}
        strategy="afterInteractive"
        onLoad={() => {
          setIsReady(true);
        }}
      />

      <Script
        id="google-analytics-config"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];

            function gtag(){
              dataLayer.push(arguments);
            }

            window.gtag = window.gtag || gtag;

            gtag('js', new Date());

            gtag('config', '${gaMeasurementId}', {
              send_page_view: false
            });
          `,
        }}
      />
    </>
  );
}

export function GoogleAnalytics() {
  if (!gaMeasurementId) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsPageView />
    </Suspense>
  );
}