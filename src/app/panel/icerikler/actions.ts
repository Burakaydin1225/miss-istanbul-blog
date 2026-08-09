"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, UserRole } from "@/generated/prisma/client";
import { ContentStatus, ContentType } from "@/lib/content-enums";
import { contentJson, slugifyContent } from "@/lib/content";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export type ContentFormState = { error?: string; success?: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string) {
  return value || null;
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseForm(formData: FormData) {
  const title = text(formData, "title");
  const rawSlug = text(formData, "slug") || title;
  const slug = slugifyContent(rawSlug);
  const excerpt = text(formData, "excerpt");
  const body = text(formData, "body");
  const statusRaw = text(formData, "status");
  const status = Object.values(ContentStatus).includes(statusRaw as ContentStatus)
    ? (statusRaw as ContentStatus)
    : ContentStatus.DRAFT;

  if (title.length < 3) throw new Error("Başlık en az 3 karakter olmalı.");
  if (!slug) throw new Error("Geçerli bir slug oluşturulamadı.");
  if (body.length < 20) throw new Error("İçerik en az 20 karakter olmalı.");

  let publishedAt = parseDate(text(formData, "publishedAt"));
  if (status === ContentStatus.PUBLISHED && !publishedAt) publishedAt = new Date();

  return {
    title,
    slug,
    excerpt: nullable(excerpt),
    content: contentJson(body),
    status,
    coverImage: nullable(text(formData, "coverImage")),
    seoTitle: nullable(text(formData, "seoTitle")),
    seoDescription: nullable(text(formData, "seoDescription")),
    canonicalUrl: nullable(text(formData, "canonicalUrl")),
    noIndex: formData.get("noIndex") === "on",
    publishedAt,
  };
}

export async function createContentAction(
  _state: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const actor = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);

  try {
    const data = parseForm(formData);
    const post = await prisma.contentPost.create({
      data: {
        ...data,
        type: ContentType.BLOG,
        // Blog paneli ilan/ilçe/kategori mimarisine yazmaz.
        districtId: null,
        categoryId: null,
      },
    });

    await writeAuditLog({
      actor,
      action: "CREATE",
      entityType: "ContentPost",
      entityId: post.id,
      description: `${post.title} blog yazısı oluşturuldu.`,
    });

    revalidatePath("/panel/icerikler");
    revalidatePath("/panel/seo");
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");
    redirect(`/panel/icerikler/${post.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Bu slug başka bir içerikte kullanılıyor." };
    }
    return { error: error instanceof Error ? error.message : "Blog yazısı oluşturulamadı." };
  }
}

export async function updateContentAction(
  id: string,
  _state: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  const actor = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);

  try {
    const existing = await prisma.contentPost.findUnique({
      where: { id },
      select: { id: true, type: true },
    });

    if (!existing || existing.type !== ContentType.BLOG) {
      return { error: "Bu kayıt blog panelinden düzenlenemez." };
    }

    const data = parseForm(formData);
    const post = await prisma.contentPost.update({
      where: { id },
      data,
    });

    await writeAuditLog({
      actor,
      action: "UPDATE",
      entityType: "ContentPost",
      entityId: post.id,
      description: `${post.title} blog yazısı güncellendi.`,
    });

    revalidatePath("/panel/icerikler");
    revalidatePath(`/panel/icerikler/${id}`);
    revalidatePath("/panel/seo");
    revalidatePath("/");
    revalidatePath("/blog");
    revalidatePath(`/blog/${post.slug}`);
    revalidatePath("/sitemap.xml");
    return { success: "Blog yazısı kaydedildi." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Bu slug başka bir içerikte kullanılıyor." };
    }
    return { error: error instanceof Error ? error.message : "Blog yazısı güncellenemedi." };
  }
}

export async function deleteContentAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  const existing = await prisma.contentPost.findUnique({
    where: { id },
    select: { id: true, title: true, type: true },
  });

  if (!existing || existing.type !== ContentType.BLOG) {
    redirect("/panel/icerikler");
  }

  const post = await prisma.contentPost.delete({ where: { id } });
  await writeAuditLog({
    actor,
    action: "DELETE",
    entityType: "ContentPost",
    entityId: id,
    description: `${post.title} blog yazısı silindi.`,
  });

  revalidatePath("/panel/icerikler");
  revalidatePath("/panel/seo");
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/sitemap.xml");
  redirect("/panel/icerikler");
}
