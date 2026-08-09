# Faz 6G — İlan URL ve panel adlandırma dönüşümü

- Yönetim yolu `/panel/urunler` yerine `/panel/ilanlar` oldu.
- Eski panel adresleri 308 kalıcı yönlendirmeyle yeni adreslere taşındı.
- Eski public `/urun/[slug]` adresleri `/ilan/[slug]` adresine yönlendirildi.
- Eski `/bolge/[slug]` adresleri `/ilce/[slug]` adresine yönlendirildi.
- Panel içi bağlantılar, import yolları ve revalidatePath çağrıları güncellendi.
- Eski public route dosyaları kaldırıldı; tekil/canonical sayfalar yeni URL altında tutuldu.

Veritabanı migration'ı gerekmez.
