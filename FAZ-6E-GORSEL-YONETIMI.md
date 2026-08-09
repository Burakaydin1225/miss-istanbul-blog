# Faz 6E — Gelişmiş Görsel Yönetimi

Bu fazda ilan formundaki medya alanı yenilendi.

## Eklenenler

- Galeri görsellerini masaüstünde sürükle-bırak ile sıralama
- Mobil kullanım için sağ/sol sıralama düğmeleri
- Galerideki herhangi bir görseli kapak yapma
- Eski kapağı otomatik olarak galeriye taşıma
- Kapak görseline ayrı alt metin girme
- Her galeri görseline ayrı alt metin girme
- Sıralama ve alt metinlerin veritabanına kaydedilmesi
- Public ilan kartı ve ilan detayında kapak alt metninin kullanılması

## Veritabanı

`Product` modeline `coverImageAlt` alanı eklendi. Aşağıdaki komut migration'ı uygular:

```powershell
npx prisma migrate deploy
npx prisma generate
npm run build
```
