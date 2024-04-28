-- CreateTable
CREATE TABLE "openmeshTemplateProducts" (
    "id" TEXT NOT NULL,
    "providerName" TEXT,
    "productName" TEXT,
    "location" TEXT,
    "cpuCores" TEXT,
    "cpuThreads" TEXT,
    "cpuGHZ" TEXT,
    "hasSGX" BOOLEAN NOT NULL DEFAULT false,
    "ram" TEXT,
    "numberDrives" TEXT,
    "avgSizeDrive" TEXT,
    "storageTotal" TEXT,
    "gpuType" TEXT,
    "gpuMemory" TEXT,
    "bandwidthNetwork" TEXT,
    "network" TEXT,
    "priceHour" TEXT,
    "priceMonth" TEXT,
    "availability" TEXT,
    "source" TEXT,
    "type" TEXT NOT NULL DEFAULT 'data',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "openmeshTemplateProducts_pkey" PRIMARY KEY ("id")
);
