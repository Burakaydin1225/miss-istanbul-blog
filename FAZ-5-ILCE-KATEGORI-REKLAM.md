# Faz 5 — İlçe, kategori ve reklam konumu yönetimi

Bu fazda yönetim paneline üç yeni modül eklendi:

- `/panel/ilceler`: İlçe oluşturma, SEO alanları, açıklamalar, sıralama ve aktif/pasif yönetimi.
- `/panel/kategoriler`: İlan kategorileri, SEO alanları, sıralama ve aktif/pasif yönetimi.
- `/panel/reklam-konumlari`: Ana sayfa, ilanlar, ilçe ve kategori alanlarına tarih aralıklı ilan yerleştirme.

## Reklam konumu güvenlikleri

- Aynı tür, kapsam, sıra ve çakışan tarih aralığında ikinci aktif kayıt oluşturulamaz.
- İlçe ve kategori zorunluluğu konum türüne göre doğrulanır.
- Süresi biten konumlar panelde otomatik işaretlenir.
- Konumlar silinebilir veya geçici olarak pasife alınabilir.
- Tüm işlemler AuditLog tablosuna yazılır.

Bu faz yeni Prisma modeli eklemez; Faz 2 şeması yeterlidir. `npx prisma generate && npm run build` çalıştırılması yeterlidir.
