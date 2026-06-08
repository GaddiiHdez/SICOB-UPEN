-- AlterTable
ALTER TABLE "Bien" ADD COLUMN     "departamentoId" INTEGER,
ADD COLUMN     "programa_adquisicion" TEXT;

-- CreateTable
CREATE TABLE "Departamento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "jefe" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_key" ON "Departamento"("nombre");

-- CreateIndex
CREATE INDEX "Bien_eliminado_departamentoId_idx" ON "Bien"("eliminado", "departamentoId");

-- AddForeignKey
ALTER TABLE "Bien" ADD CONSTRAINT "Bien_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;
