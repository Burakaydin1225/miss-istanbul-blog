-- Miss Istanbul Faz 2: geriye uyumlu veri mimarisi.
-- Mevcut Product tablosu ve kayıtları korunur.

CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'ARCHIVED');
CREATE TYPE "PlacementType" AS ENUM ('HOME_HERO', 'HOME_FEATURED', 'LISTINGS_FEATURED', 'DISTRICT_TOP', 'CATEGORY_TOP', 'DISTRICT_CATEGORY_TOP');
CREATE TYPE "ContentType" AS ENUM ('BLOG', 'GUIDE');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "District" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "shortDescription" TEXT,
  "description" TEXT,
  "coverImage" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "District_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Neighborhood" (
  "id" TEXT NOT NULL,
  "districtId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Neighborhood_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ListingCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "shortDescription" TEXT,
  "description" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ListingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Placement" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "PlacementType" NOT NULL,
  "districtId" TEXT,
  "categoryId" TEXT,
  "position" INTEGER NOT NULL DEFAULT 1,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentPost" (
  "id" TEXT NOT NULL,
  "type" "ContentType" NOT NULL,
  "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "excerpt" TEXT,
  "content" JSONB NOT NULL,
  "coverImage" TEXT,
  "districtId" TEXT,
  "categoryId" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "canonicalUrl" TEXT,
  "noIndex" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SeoRedirect" (
  "id" TEXT NOT NULL,
  "sourcePath" TEXT NOT NULL,
  "targetPath" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL DEFAULT 301,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoRedirect_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product"
  ADD COLUMN "districtId" TEXT,
  ADD COLUMN "neighborhoodId" TEXT,
  ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "status" "ListingStatus" NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "featuredOnHome" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featuredOnListings" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "featuredOnDistrict" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "canonicalUrl" TEXT,
  ADD COLUMN "noIndex" BOOLEAN NOT NULL DEFAULT false;

-- Mevcut aktif ilanları yayınlanmış kabul et ve tarih bilgisini koru.
UPDATE "Product"
SET "publishedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP)
WHERE "isActive" = true AND "publishedAt" IS NULL;

CREATE UNIQUE INDEX "District_slug_key" ON "District"("slug");
CREATE INDEX "District_isActive_sortOrder_idx" ON "District"("isActive", "sortOrder");
CREATE UNIQUE INDEX "Neighborhood_districtId_slug_key" ON "Neighborhood"("districtId", "slug");
CREATE INDEX "Neighborhood_districtId_isActive_sortOrder_idx" ON "Neighborhood"("districtId", "isActive", "sortOrder");
CREATE UNIQUE INDEX "ListingCategory_slug_key" ON "ListingCategory"("slug");
CREATE INDEX "ListingCategory_isActive_sortOrder_idx" ON "ListingCategory"("isActive", "sortOrder");
CREATE INDEX "Placement_type_isActive_startsAt_expiresAt_idx" ON "Placement"("type", "isActive", "startsAt", "expiresAt");
CREATE INDEX "Placement_districtId_type_position_idx" ON "Placement"("districtId", "type", "position");
CREATE INDEX "Placement_categoryId_type_position_idx" ON "Placement"("categoryId", "type", "position");
CREATE INDEX "Placement_productId_idx" ON "Placement"("productId");
CREATE UNIQUE INDEX "ContentPost_slug_key" ON "ContentPost"("slug");
CREATE INDEX "ContentPost_type_status_publishedAt_idx" ON "ContentPost"("type", "status", "publishedAt");
CREATE INDEX "ContentPost_districtId_type_status_idx" ON "ContentPost"("districtId", "type", "status");
CREATE INDEX "ContentPost_categoryId_type_status_idx" ON "ContentPost"("categoryId", "type", "status");
CREATE UNIQUE INDEX "SeoRedirect_sourcePath_key" ON "SeoRedirect"("sourcePath");
CREATE INDEX "SeoRedirect_isActive_idx" ON "SeoRedirect"("isActive");
CREATE INDEX "Product_districtId_status_priority_idx" ON "Product"("districtId", "status", "priority");
CREATE INDEX "Product_categoryId_status_priority_idx" ON "Product"("categoryId", "status", "priority");
CREATE INDEX "Product_neighborhoodId_status_idx" ON "Product"("neighborhoodId", "status");
CREATE INDEX "Product_expiresAt_idx" ON "Product"("expiresAt");

ALTER TABLE "Neighborhood" ADD CONSTRAINT "Neighborhood_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "Neighborhood"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ListingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ListingCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContentPost" ADD CONSTRAINT "ContentPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ListingCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
