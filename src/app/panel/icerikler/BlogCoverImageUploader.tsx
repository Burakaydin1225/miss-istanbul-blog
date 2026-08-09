"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";

type Props = {
  defaultValue?: string | null;
};

type PresignResponse = {
  uploadUrl?: string;
  publicUrl?: string;
  error?: string;
};

const MAX_SOURCE_SIZE = 20 * 1024 * 1024;
const MAX_DIMENSION = 1800;
const TARGET_QUALITY = 0.78;

async function toWebp(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Lütfen geçerli bir görsel dosyası seçin.");
  }

  if (file.size <= 0 || file.size > MAX_SOURCE_SIZE) {
    throw new Error("Kapak görseli en fazla 20 MB olabilir.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = document.createElement("img");
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Görsel okunamadı."));
      img.src = objectUrl;
    });

    const longest = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Görsel işlenemedi.");

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", TARGET_QUALITY),
    );

    if (!blob) throw new Error("Görsel WebP formatına dönüştürülemedi.");

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "blog-kapak"}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function BlogCoverImageUploader({ defaultValue = "" }: Props) {
  const [imageUrl, setImageUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const optimized = await toWebp(file);
      const response = await fetch("/api/uploads/content-presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: optimized.type,
          fileSize: optimized.size,
        }),
      });

      const result = (await response.json()) as PresignResponse;

      if (!response.ok || !result.uploadUrl || !result.publicUrl) {
        throw new Error(result.error ?? "Yükleme adresi alınamadı.");
      }

      const upload = await fetch(result.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": optimized.type,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
        body: optimized,
      });

      if (!upload.ok) {
        throw new Error(`R2 yüklemesi başarısız oldu (${upload.status}).`);
      }

      setImageUrl(result.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="md:col-span-2">
      <input type="hidden" name="coverImage" value={imageUrl} />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">Kapak görseli</p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            İsteğe bağlıdır. Yazıyı görselsiz yayınlayabilir, kapak görselini daha sonra ekleyebilirsin.
          </p>
        </div>
        {imageUrl ? (
          <button
            type="button"
            onClick={() => setImageUrl("")}
            disabled={uploading}
            className="text-xs font-bold text-red-600 disabled:opacity-50"
          >
            Kaldır
          </button>
        ) : null}
      </div>

      {imageUrl ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
          <div className="relative aspect-[16/7] w-full bg-neutral-100">
            <Image src={imageUrl} alt="Blog kapak görseli" fill sizes="(max-width: 768px) 100vw, 900px" className="object-cover" />
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="min-w-0 truncate text-xs text-neutral-500">Görsel R2 üzerinde kayıtlı</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? "Yükleniyor..." : "Görseli değiştir"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 text-center transition hover:border-amber-400 hover:bg-amber-50/40 disabled:opacity-50"
        >
          <span className="text-2xl">＋</span>
          <span className="mt-2 text-sm font-bold text-neutral-800">
            {uploading ? "Görsel yükleniyor..." : "Dosyadan kapak görseli seç"}
          </span>
          <span className="mt-1 text-xs text-neutral-500">JPG, PNG, WEBP veya AVIF · zorunlu değil</span>
        </button>
      )}

      {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
