import { ContentStatus, ContentType, Prisma } from "@/generated/prisma/client";

export type StoredContent = {
  body: string;
};

export function contentBody(value: Prisma.JsonValue): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const body = (value as Record<string, Prisma.JsonValue>).body;
    return typeof body === "string" ? body : "";
  }
  return "";
}

export function contentJson(body: string): Prisma.InputJsonValue {
  return { body };
}

export function contentPath(type: ContentType, slug: string): string {
  return `/${type === ContentType.GUIDE ? "rehber" : "blog"}/${slug}`;
}

export function contentTypeLabel(type: ContentType): string {
  return type === ContentType.GUIDE ? "Rehber" : "Blog";
}

export function contentStatusLabel(status: ContentStatus): string {
  if (status === ContentStatus.PUBLISHED) return "Yayında";
  if (status === ContentStatus.ARCHIVED) return "Arşiv";
  return "Taslak";
}

export function slugifyContent(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u")
    .replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
