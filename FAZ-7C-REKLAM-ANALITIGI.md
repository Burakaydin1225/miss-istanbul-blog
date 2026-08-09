# Faz 7C — Gerçek Reklam Konumu Analitiği

Bu faz ile reklam konumları artık ilan toplam performansından tahmin edilmez.

## Yeni olaylar
- `PLACEMENT_IMPRESSION`: Kart en az %50 görünür olup 800 ms ekranda kaldığında kaydedilir.
- `PLACEMENT_CLICK`: Reklam kartına tıklandığında kaydedilir.

## Ölçülen bilgiler
- Reklam konumu kimliği
- İlan kimliği
- Konum türü
- Sıra
- Sayfa yolu
- Trafik kaynağı
- Cihaz türü
- Oturum ve anonim ziyaretçi

## Tekilleştirme
Aynı reklam konumunun gösterimi aynı oturumda bir kez sayılır. Sunucu tarafında da 30 dakikalık tekrar koruması vardır.

## Kurulum
```powershell
npx prisma migrate deploy
npx prisma generate
npm run build
```
