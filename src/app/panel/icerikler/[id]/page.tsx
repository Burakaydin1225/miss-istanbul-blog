import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentForm } from "../ContentForm";
import { deleteContentAction, updateContentAction } from "../actions";
import { contentBody, contentPath } from "@/lib/content";
import prisma from "@/lib/prisma";
type Props = { params: Promise<{ id: string }> };
export default async function EditContentPage({ params }: Props) {
  const { id } = await params;
  const [post, districts, categories] = await Promise.all([prisma.contentPost.findUnique({ where: { id } }), prisma.district.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }), prisma.listingCategory.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } })]);
  if (!post) notFound();
  const update = updateContentAction.bind(null, id);
  const remove = deleteContentAction.bind(null, id);
  return <div className="max-w-4xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/panel/icerikler" className="text-sm font-medium text-neutral-500">← İçeriklere dön</Link><h1 className="mt-4 text-2xl font-bold">{post.title}</h1></div><div className="flex gap-2"><Link href={contentPath(post.type, post.slug)} target="_blank" className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold">Sayfayı aç</Link><form action={remove}><button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">Sil</button></form></div></div><div className="mt-6"><ContentForm action={update} districts={districts} categories={categories} submitLabel="Değişiklikleri kaydet" values={{ ...post, body: contentBody(post.content) }} /></div></div>;
}
