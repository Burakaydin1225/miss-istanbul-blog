import type { NextConfig } from "next";

const defaultSiteUrl = "https://missistanbul.com";

function getCanonicalUrl(): URL {
  const rawValue = process.env.NEXT_PUBLIC_SITE_URL?.trim() || defaultSiteUrl;

  try {
    return new URL(rawValue.startsWith("http") ? rawValue : `https://${rawValue}`);
  } catch {
    return new URL(defaultSiteUrl);
  }
}

const canonicalUrl = getCanonicalUrl();
const canonicalHost = canonicalUrl.host;
const alternateHost = canonicalUrl.hostname.startsWith("www.")
  ? canonicalUrl.hostname.replace(/^www\./, "")
  : `www.${canonicalUrl.hostname}`;

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "images.unsplash.com",
    port: "",
    pathname: "/**",
  },
];

const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();

if (r2PublicUrl) {
  try {
    const parsedR2Url = new URL(r2PublicUrl);

    remotePatterns.push({
      protocol: parsedR2Url.protocol === "http:" ? "http" : "https",
      hostname: parsedR2Url.hostname,
      port: parsedR2Url.port,
      pathname: "/**",
    });
  } catch {
    console.warn(
      "R2_PUBLIC_URL geçersiz olduğu için image remotePatterns içine eklenmedi.",
    );
  }
}

const noIndexHeaders = [
  {
    key: "X-Robots-Tag",
    value: "noindex, nofollow, noarchive",
  },
];

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    unoptimized: true,
    remotePatterns,
  },

  async redirects() {
    const legacyRedirects = [
      {
        source: "/urun/:slug",
        destination: "/ilan/:slug",
        permanent: true,
      },
      {
        source: "/bolge/:slug",
        destination: "/ilce/:slug",
        permanent: true,
      },
      {
        source: "/panel/urunler",
        destination: "/panel/ilanlar",
        permanent: true,
      },
      {
        source: "/panel/urunler/:path*",
        destination: "/panel/ilanlar/:path*",
        permanent: true,
      },
    ];

    if (
      canonicalUrl.hostname === "localhost" ||
      canonicalUrl.hostname === "127.0.0.1"
    ) {
      return legacyRedirects;
    }

    return [
      ...legacyRedirects,
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: alternateHost,
          },
        ],
        destination: `${canonicalUrl.protocol}//${canonicalHost}/:path*`,
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/panel/:path*",
        headers: noIndexHeaders,
      },
      {
        source: "/yonetici-giris",
        headers: noIndexHeaders,
      },
      {
        source: "/api/:path*",
        headers: noIndexHeaders,
      },
    ];
  },
};

export default nextConfig;
