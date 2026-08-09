# Faz 4 — Blog ve Rehber İçerik Yönetimi

Bu fazda `ContentPost` modeli kullanıcıya açık blog/rehber sayfalarına ve yönetim paneline bağlandı.

## Eklenenler
- `/blog` ve `/rehber` gerçek veritabanı kayıtlarını listeler.
- `/blog/[slug]` ve `/rehber/[slug]` detay sayfaları.
- Dinamik metadata, canonical, noindex ve Article JSON-LD.
- Panelde `/panel/icerikler` listeleme, ekleme, düzenleme ve silme.
- İçerik türü, durum, ilçe, kategori, yayın tarihi, kapak görseli ve SEO alanları.
- Basit içerik biçimi: boş satır paragraf, `##` ikinci seviye başlık, `###` üçüncü seviye başlık.
- Sitemap mevcut ContentPost kayıtlarını otomatik dahil eder.

## Kullanım
Panel > İçerikler > Yeni içerik yolundan rehber veya blog kaydı oluşturulur. Yayındaki kayıtların yayın tarihi geçmişte veya o an olmalıdır.
