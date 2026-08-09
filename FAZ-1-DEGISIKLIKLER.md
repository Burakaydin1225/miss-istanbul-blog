# Faz 1 — Merkezi Marka ve Domain Yapılandırması

Tamamlananlar:

- Varsayılan ana domain `https://missistanbul.com` olarak değiştirildi.
- Marka, domain, WhatsApp ve sosyal medya ayarları `src/lib/site-config.ts` altında merkezileştirildi.
- `www` / kök domain yönlendirmesi `NEXT_PUBLIC_SITE_URL` üzerinden dinamik hale getirildi.
- Eski `beylikduzu24.com` sabitleri kaldırıldı.
- Eski toplu domain değiştirme scriptleri kaldırıldı.
- Open Graph ve Twitter görsel metinleri Miss İstanbul mimarisine uygun hale getirildi.
- Genel güvenlik header'ları eklendi.
- `seo-env.example` yeni yapı için güncellendi.
- Gerçek `.env` dosyası dağıtım paketinden çıkarıldı.

## Yerelde yapılacaklar

1. `seo-env.example` dosyasını `.env` olarak kopyalayın.
2. Veritabanı ve R2 değerlerini kendi servis bilgilerinizle doldurun.
3. Şu komutları çalıştırın:

```powershell
npm install
npx prisma generate
npm run build
```

## Sonraki faz

- Prisma veri modelinin `Product` tabanlı katalog yapısından `Listing`, `District`, `Category`, `Placement` ve `ContentPost` mimarisine dönüştürülmesi.
