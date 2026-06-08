-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "eliminado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eliminadoEn" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Bien_eliminado_estado_idx" ON "Bien"("eliminado", "estado");

-- CreateIndex
CREATE INDEX "Bien_eliminado_categoriaId_idx" ON "Bien"("eliminado", "categoriaId");
