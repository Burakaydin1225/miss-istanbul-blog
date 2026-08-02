"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ContentStatus, ContentType, Prisma, UserRole } from "@/generated/prisma/client";
import { contentJson, contentPath, slugifyContent } from "@/lib/content";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export type ContentFormState = { error?: string; success?: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string) { return value || null; }

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function parseForm(formData: FormData) {
  const title = text(formData, "title");
  const rawSlug = text(formData, "slug") || title;
  const slug = slugifyContent(rawSlug);
  const excerpt = text(formData, "excerpt");
  const body = text(formData, "body");
  const typeRaw = text(formData, "type");
  const statusRaw = text(formData, "status");
  const type = typeRaw === ContentType.BLOG ? ContentType.BLOG : ContentType.GUIDE;
  const status = Object.values(ContentStatus).includes(statusRaw as ContentStatus) ? statusRaw as ContentStatus : ContentStatus.DRAFT;
  if (title.length < 3) throw new Error("Başlık en az 3 karakter olmalı.");
  if (!slug) throw new Error("Geçerli bir slug oluşturulamadı.");
  if (body.length < 20) throw new Error("İçerik en az 20 karakter olmalı.");
  let publishedAt = parseDate(text(formData, "publishedAt"));
  if (status === ContentStatus.PUBLISHED && !publishedAt) publishedAt = new Date();
  return {
    title, slug, excerpt: nullable(excerpt), content: contentJson(body), type, status,
    coverImage: nullable(text(formData, "coverImage")),
    districtId: nullable(text(formData, "districtId")), categoryId: nullable(text(formData, "categoryId")),
    seoTitle: nullable(text(formData, "seoTitle")), seoDescription: nullable(text(formData, "seoDescription")),
    canonicalUrl: nullable(text(formData, "canonicalUrl")), noIndex: formData.get("noIndex") === "on", publishedAt,
  } satisfies Prisma.ContentPostUncheckedCreateInput;
}

export async function createContentAction(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const actor = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);
  try {
    const data = await parseForm(formData);
    const post = await prisma.contentPost.create({ data });
    await writeAuditLog({ actor, action: "CREATE", entityType: "ContentPost", entityId: post.id, description: `${post.title} içeriği oluşturuldu.` });
    revalidatePath("/panel/icerikler"); revalidatePath("/blog"); revalidatePath("/rehber"); revalidatePath("/sitemap.xml");
    redirect(`/panel/icerikler/${post.id}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Bu slug başka bir içerikte kullanılıyor." };
    return { error: error instanceof Error ? error.message : "İçerik oluşturulamadı." };
  }
}

export async function updateContentAction(id: string, _state: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const actor = await requireRole([UserRole.ADMIN, UserRole.EDITOR]);
  try {
    const data = await parseForm(formData);
    const post = await prisma.contentPost.update({ where: { id }, data });
    await writeAuditLog({ actor, action: "UPDATE", entityType: "ContentPost", entityId: post.id, description: `${post.title} içeriği güncellendi.` });
    revalidatePath("/panel/icerikler"); revalidatePath(`/panel/icerikler/${id}`); revalidatePath("/blog"); revalidatePath("/rehber"); revalidatePath(contentPath(post.type, post.slug)); revalidatePath("/sitemap.xml");
    return { success: "İçerik kaydedildi." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { error: "Bu slug başka bir içerikte kullanılıyor." };
    return { error: error instanceof Error ? error.message : "İçerik güncellenemedi." };
  }
}

export async function deleteContentAction(id: string) {
  const actor = await requireRole([UserRole.ADMIN]);
  const post = await prisma.contentPost.delete({ where: { id } });
  await writeAuditLog({ actor, action: "DELETE", entityType: "ContentPost", entityId: id, description: `${post.title} içeriği silindi.` });
  revalidatePath("/panel/icerikler"); revalidatePath("/blog"); revalidatePath("/rehber"); revalidatePath("/sitemap.xml");
  redirect("/panel/icerikler");
}
