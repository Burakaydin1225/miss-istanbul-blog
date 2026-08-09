# Faz 3 — Kullanıcıya Açık Site İskeleti

Bu pakette çalışan veri modeli korunarak yeni Miss İstanbul public mimarisi eklendi.

## Yeni rotalar

- `/`
- `/ilanlar`
- `/ilan/[slug]`
- `/ilceler`
- `/ilce/[slug]`
- `/kategoriler`
- `/kategori/[slug]`
- `/reklam-ver`
- `/rehber`
- `/blog`

## Yeni bileşenler

- `SiteHeader`
- `SiteFooter`
- `PublicLayout`
- `ListingCard`
- `SectionHeading`

## Davranışlar

- Yalnızca aktif, yayındaki ve süresi geçmemiş ilanlar gösterilir.
- Ana sayfa öne çıkan ilanları önceliklendirir.
- İlçe ve kategori sayfaları temiz URL ile çalışır.
- `/ilanlar` üzerindeki filtreler query parametresiyle kullanıcı deneyimi sağlar.
- İlan detayında galeri, konum, WhatsApp ve benzer ilanlar bulunur.
- Sitemap yeni URL mimarisine geçirildi.

## Not

`/rehber` ve `/blog` bu fazda yalnızca public giriş sayfasıdır. Faz 4'te `ContentPost` modeliyle editör ve detay sayfaları bağlanacaktır.
