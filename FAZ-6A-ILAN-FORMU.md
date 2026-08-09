# Faz 6A — İlan Formunun Yeni Mimariye Bağlanması

Bu pakette mevcut tek sayfalık ürün formu, çalışan yapıyı bozmadan ilan yönetim formuna dönüştürüldü.

## Eklenen alanlar

- İlçe ve mahalle seçimi
- Yeni ilan kategorisi seçimi
- Taslak / yayında / durduruldu / arşiv durumu
- 0–1000 öncelik puanı
- Yayın başlangıç ve bitiş tarihi
- Ana sayfa, ilanlar ve ilçe vitrin seçenekleri
- SEO başlığı ve açıklaması
- Canonical URL
- Noindex kontrolü

## Sunucu doğrulamaları

- İlçe, mahalle ve kategori kayıtlarının veritabanında bulunması
- Mahallenin seçilen ilçeye ait olması
- Tarih aralığının geçerli olması
- Öncelik puanı sınırı
- SEO karakter sınırları
- Canonical URL’nin HTTPS olması

## Not

Bu faz yeni Prisma modeli eklemez; Faz 2’de eklenen alanları kullanır. Bu nedenle yeni migration gerekmez.

Çalıştırma:

```powershell
npm install
npx prisma generate
npm run build
```
