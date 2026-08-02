import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ortam değişkeni bulunamadı.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const districts = [
  ["Adalar", "adalar"], ["Arnavutköy", "arnavutkoy"], ["Ataşehir", "atasehir"],
  ["Avcılar", "avcilar"], ["Bağcılar", "bagcilar"], ["Bahçelievler", "bahcelievler"],
  ["Bakırköy", "bakirkoy"], ["Başakşehir", "basaksehir"], ["Bayrampaşa", "bayrampasa"],
  ["Beşiktaş", "besiktas"], ["Beykoz", "beykoz"], ["Beylikdüzü", "beylikduzu"],
  ["Beyoğlu", "beyoglu"], ["Büyükçekmece", "buyukcekmece"], ["Çatalca", "catalca"],
  ["Çekmeköy", "cekmekoy"], ["Esenler", "esenler"], ["Esenyurt", "esenyurt"],
  ["Eyüpsultan", "eyupsultan"], ["Fatih", "fatih"], ["Gaziosmanpaşa", "gaziosmanpasa"],
  ["Güngören", "gungoren"], ["Kadıköy", "kadikoy"], ["Kağıthane", "kagithane"],
  ["Kartal", "kartal"], ["Küçükçekmece", "kucukcekmece"], ["Maltepe", "maltepe"],
  ["Pendik", "pendik"], ["Sancaktepe", "sancaktepe"], ["Sarıyer", "sariyer"],
  ["Silivri", "silivri"], ["Sultanbeyli", "sultanbeyli"], ["Sultangazi", "sultangazi"],
  ["Şile", "sile"], ["Şişli", "sisli"], ["Tuzla", "tuzla"],
  ["Ümraniye", "umraniye"], ["Üsküdar", "uskudar"], ["Zeytinburnu", "zeytinburnu"],
] as const;

async function main() {
  for (const [index, [name, slug]] of districts.entries()) {
    await prisma.district.upsert({
      where: { slug },
      create: { name, slug, sortOrder: index + 1 },
      update: { name, sortOrder: index + 1, isActive: true },
    });
  }

  const allDistricts = await prisma.district.findMany();
  const districtBySlug = new Map(allDistricts.map((district) => [district.slug, district.id]));

  // Eski `region` alanı ilçe slug'ı ile eşleşiyorsa yeni ilişkiye taşınır.
  for (const [slug, districtId] of districtBySlug) {
    await prisma.product.updateMany({
      where: { districtId: null, region: slug },
      data: { districtId },
    });
  }

  console.log(`${districts.length} İstanbul ilçesi hazırlandı.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
