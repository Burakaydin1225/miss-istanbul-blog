import type { MetadataRoute } from "next";
import prisma from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const contents = await prisma.contentPost.findMany({
    where: { status: "PUBLISHED", noIndex: false, publishedAt: { lte: new Date() } },
    select: { slug: true, type: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const latest = contents[0]?.updatedAt;
  const staticRoutes: MetadataRoute.Sitemap = [
    ["/", "daily", 1],
    ["/blog", "daily", .9],
    ["/rehber", "weekly", .75],
    ["/reklam-ver", "monthly", .5],
    ["/hakkimizda", "monthly", .4],
    ["/iletisim", "monthly", .4],
    ["/gizlilik-politikasi", "yearly", .2],
    ["/kullanim-kosullari", "yearly", .2],
  ].map(([path, changeFrequency, priority]) => ({
    url: absoluteUrl(path as string),
    lastModified: latest,
    changeFrequency: changeFrequency as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: priority as number,
  }));

  return [
    ...staticRoutes,
    ...contents.map((item) => ({
      url: absoluteUrl(`/${item.type === "GUIDE" ? "rehber" : "blog"}/${item.slug}`),
      lastModified: item.updatedAt,
      changeFrequency: "monthly" as const,
      priority: .7,
    })),
  ];
}
