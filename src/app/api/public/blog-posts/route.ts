import { NextRequest, NextResponse } from "next/server";
import { ContentType } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  const rawPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const now = new Date();

  const posts = await prisma.contentPost.findMany({
    where: {
      type: ContentType.BLOG,
      status: "PUBLISHED",
      noIndex: false,
      publishedAt: { lte: now },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      createdAt: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return NextResponse.json({
    page,
    posts: posts.map((post) => ({
      ...post,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdAt: post.createdAt.toISOString(),
    })),
  });
}
