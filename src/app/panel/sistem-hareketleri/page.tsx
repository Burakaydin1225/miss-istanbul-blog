import { requireOwner } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

export default async function ContentActivityPage() {
  await requireOwner();

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "ContentPost" },
        { action: { in: ["LOGIN_SUCCESS", "LOGOUT", "USER_PASSWORD_CHANGE"] } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">Sistem</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">İçerik hareketleri</h1>
        <p className="mt-2 text-sm text-neutral-500">İlan, ödeme ve reklam kayıtları bu görünümde bilinçli olarak gizlenir.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
        {logs.length ? (
          <div className="divide-y divide-neutral-100">
            {logs.map((log) => (
              <div key={log.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)_180px] sm:items-center">
                <p className="text-xs font-bold text-neutral-400">{formatDateTime(log.createdAt)}</p>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-900">{log.description}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{log.entityType} · {log.action}</p>
                </div>
                <p className="truncate text-xs font-semibold text-neutral-500">{log.actorName || "Sistem"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-neutral-500">Henüz blog hareketi kaydedilmedi.</p>
        )}
      </div>
    </div>
  );
}
