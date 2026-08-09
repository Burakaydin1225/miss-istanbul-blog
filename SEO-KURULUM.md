# Miss İstanbul — Ortam ve SEO Kurulumu

## Zorunlu ortam değişkenleri

`seo-env.example` dosyasındaki değerleri yerel `.env` dosyanıza ve Vercel Environment Variables bölümüne ekleyin.

Ana ve kalıcı domain:

```env
NEXT_PUBLIC_SITE_URL=https://missistanbul.com
```

Marka, domain ve iletişim ayarlarının merkezi kaynağı:

```text
src/lib/site-config.ts
```

Kodun farklı yerlerine domain veya WhatsApp numarası yazmayın.

## Kontrol komutları

```powershell
npm install
npx prisma generate
npm run build
```

## Yayından sonra kontrol edilecek adresler

- `/robots.txt`
- `/sitemap.xml`
- `/opengraph-image`
- `/hakkimizda`
- `/iletisim`
- `/ilan-yayinlama-kurallari`
- `/gizlilik-politikasi`
- `/kullanim-kosullari`

## Domain bağlantısından sonra

1. Vercel'de `missistanbul.com` ana domain olarak ayarlanır.
2. `www.missistanbul.com`, ana domaine kalıcı yönlendirilir.
3. Google Search Console'da Domain Property oluşturulur.
4. DNS doğrulaması yapılır.
5. `https://missistanbul.com/sitemap.xml` gönderilir.
6. Ana sayfa ve önemli URL'ler URL Denetleme aracında kontrol edilir.

## Güvenlik

Gerçek `.env` dosyası kaynak arşivlerine veya GitHub'a eklenmemelidir. Daha önce paylaşılmış anahtarlar varsa R2, veritabanı ve diğer servislerde yenilenmelidir.
