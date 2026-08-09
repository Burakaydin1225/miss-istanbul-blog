# Blog sayfalama ve daha fazla yükleme

- Ana sayfa ilk açılışta 10 yazı getirir.
- “Daha fazla yazı yükle” düğmesi sonraki 10 yazıyı sayfa yenilemeden ekler.
- URL arka planda `?page=2`, `?page=3` şeklinde güncellenir.
- Sayfa numarası bağlantıları Google ve JavaScript kapalı kullanıcılar için gerçek, taranabilir URL'lerdir.
- `/blog` sayfası klasik ve SEO dostu 12 yazılık sayfalama kullanır.
- 100 yazı olduğunda ana sayfa hepsini ilk yüklemede indirmez; performans korunur.
