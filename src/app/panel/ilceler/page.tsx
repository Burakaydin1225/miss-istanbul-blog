import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreateDistrictForm, EditDistrictForm } from "./DistrictForms";

export default async function DistrictsPage() {
  await requireRole([UserRole.ADMIN]);
  const districts = await prisma.district.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true, contents: true, neighborhoods: true, placements: true } } } });
  return <div className="space-y-6"><div><p className="text-sm text-neutral-500">SEO ve ilan filtreleri</p><h1 className="text-3xl font-semibold tracking-tight">İlçeler</h1></div><CreateDistrictForm /><div className="space-y-3">{districts.map((district) => <EditDistrictForm key={district.id} district={district} />)}</div></div>;
}
