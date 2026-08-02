import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreateCategoryForm, EditCategoryForm } from "./CategoryForms";
export default async function CategoriesPage(){await requireRole([UserRole.ADMIN]);const items=await prisma.listingCategory.findMany({orderBy:[{sortOrder:"asc"},{name:"asc"}],include:{_count:{select:{products:true,contents:true,placements:true}}}});return <div className="space-y-6"><div><p className="text-sm text-neutral-500">İlan sınıflandırması ve SEO sayfaları</p><h1 className="text-3xl font-semibold tracking-tight">Kategoriler</h1></div><CreateCategoryForm/><div className="space-y-3">{items.map(item=><EditCategoryForm key={item.id} item={item}/>)}</div></div>}
