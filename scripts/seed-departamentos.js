const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Sembrando Departamentos...');
  
  const d1 = await prisma.departamento.create({ data: { nombre: 'Dirección de Tecnologías de la Información', jefe: 'Ing. Alejandro Solís' } });
  const d2 = await prisma.departamento.create({ data: { nombre: 'Rectoría', jefe: 'Mtra. Sofía Rodríguez' } });
  const d3 = await prisma.departamento.create({ data: { nombre: 'Facultad de Ingeniería', jefe: 'Dr. Manuel García' } });
  const d4 = await prisma.departamento.create({ data: { nombre: 'Servicios Escolares', jefe: 'Lic. Martha Pérez' } });
  
  console.log('✅ Departamentos creados exitosamente.');

  // Assign existing bienes to DTI by default
  await prisma.bien.updateMany({
    data: { departamentoId: d1.id }
  });
  console.log('✅ Bienes existentes asignados a DTI.');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
