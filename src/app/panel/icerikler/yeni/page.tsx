import Link from "next/link";

import { ContentForm } from "../ContentForm";
import { createContentAction } from "../actions";

export default function NewContentPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/panel/icerikler" className="text-sm font-medium text-neutral-500">
        ← Yazılara dön
      </Link>
      <div className="mt-4">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">İçerik Merkezi</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-neutral-950">Yeni blog yazısı</h1>
        <p className="mt-2 text-sm text-neutral-500">Yalnızca Miss İstanbul blog içeriği oluşturulur; ilan verilerine dokunulmaz.</p>
      </div>
      <div className="mt-7">
        <ContentForm action={createContentAction} submitLabel="Blog yazısını oluştur" />
      </div>
    </div>
  );
}
