-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "tickerText" TEXT NOT NULL DEFAULT 'Envíos a domicilio · Otoño · Invierno 26 · +56 9 4631 2281',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
