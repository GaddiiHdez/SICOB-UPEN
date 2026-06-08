/*
  Warnings:

  - You are about to drop the column `usuarioId` on the `Asignacion` table. All the data in the column will be lost.
  - Added the required column `personalId` to the `Asignacion` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Asignacion" DROP CONSTRAINT "Asignacion_usuarioId_fkey";

-- AlterTable
ALTER TABLE "Asignacion" DROP COLUMN "usuarioId",
ADD COLUMN     "personalId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Personal" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "puesto" TEXT,
    "departamentoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Personal_correo_key" ON "Personal"("correo");

-- AddForeignKey
ALTER TABLE "Personal" ADD CONSTRAINT "Personal_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asignacion" ADD CONSTRAINT "Asignacion_personalId_fkey" FOREIGN KEY ("personalId") REFERENCES "Personal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
