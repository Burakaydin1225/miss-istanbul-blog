# Miss İstanbul Blog Paneli — Güvenli Mod

Bu sürüm, aynı PostgreSQL veritabanının başka bir uygulama tarafından da kullanılıyor olabileceği varsayımıyla hazırlanmıştır.

## Bilinçli olarak yapılmayanlar

- `prisma/schema.prisma` değiştirilmedi.
- Migration eklenmedi veya çalıştırılmadı.
- `Product`, `ProductPayment`, `Placement`, `District`, `ListingCategory` ve ilgili tablolar silinmedi/değiştirilmedi.
- İlan, abonelik, fiyat önerisi, reklam konumu, ilçe ve kategori yönetim route'ları blog panelinden kaldırıldı.
- Site Ayarları ve Kullanıcı yönetimi panelden kaldırıldı; ortak veritabanındaki ayar/kullanıcı kayıtlarına yanlışlıkla dokunma riski azaltıldı.

## Blog panelinin yazdığı alanlar

- `ContentPost` (`type = BLOG`)
- İçerik işlemlerine ait `AuditLog`
- Kullanıcının kendi hesabı/şifre işlemleri (mevcut auth altyapısı)

## Önemli

Gerçek veritabanının Beylikduzu25 ile aynı olup olmadığı yalnızca `.env` içindeki `DATABASE_URL` / `DIRECT_URL` değerleri karşılaştırılarak kesinleştirilebilir. Bu paket `.env` içermediği için bağlantı hedefi bu dosya üzerinden doğrulanamaz.
