# Blog kapak görseli yükleme

- Kapak görseli URL alanı kaldırıldı.
- Dosyadan JPG/PNG/WEBP/AVIF seçilebilir.
- Görsel tarayıcıda WebP formatına dönüştürülür ve R2'ye yüklenir.
- Blog görselleri `blog/YYYY/MM/` altında saklanır.
- Kapak görseli tamamen opsiyoneldir; görselsiz yazı kaydedilebilir/yayınlanabilir.
- Düzenleme ekranında daha sonra görsel eklenebilir, değiştirilebilir veya kaldırılabilir.
- Veritabanı şemasında değişiklik yoktur; ContentPost.coverImage alanı mevcut URL'yi tutmaya devam eder.
