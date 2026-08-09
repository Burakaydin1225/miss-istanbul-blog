# Faz 2 — Veritabanı mimarisi

Bu faz mevcut ilanları silmeden yeni Miss İstanbul mimarisini ekler.

## Eklenen yapılar

- `District` ve `Neighborhood`
- `ListingCategory`
- `Placement`
- `ContentPost`
- `SeoRedirect`
- İlan yayın durumu, öncelik, öne çıkarma ve SEO alanları

`Product` modeli bu fazda özellikle korunmuştur. Böylece mevcut panel ve public site çalışmaya devam eder. Public sayfalar ve panel yeni modellere taşındıktan sonra son bir migration ile model adını `Listing` olarak değiştireceğiz.

## Uygulama

```powershell
npx prisma migrate deploy
npx prisma generate
npm run seed:architecture
npm run build
```

`seed:architecture` İstanbul'un 39 ilçesini ekler. Eski `Product.region` değeri bir ilçe slug'ıyla birebir eşleşiyorsa `districtId` alanını otomatik doldurur.

## Güvenlik

Migration geriye uyumludur: mevcut `Product`, görseller, WhatsApp butonları, ödemeler ve analitik kayıtları silinmez.
