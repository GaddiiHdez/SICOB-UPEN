const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Iniciando la siembra de base de datos (Seed) refactorizada...');

  // 1. Limpieza de datos previos (en orden inverso de relaciones)
  await prisma.asignacion.deleteMany({});
  await prisma.bien.deleteMany({});
  await prisma.categoria.deleteMany({});
  await prisma.ubicacion.deleteMany({});
  await prisma.personal.deleteMany({});
  await prisma.departamento.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.configuracion.deleteMany({});

  console.log('🧹 Base de datos limpiada con éxito.');

  // 2. Crear configuración global para los códigos de inventario
  await prisma.configuracion.create({
    data: {
      clave: 'formato_codigo_inventario',
      valor: 'UPEN-{CAT}-{YEAR}-{CORRELATIVO}',
      descripcion: 'Plantilla global para códigos de inventario. Etiquetas permitidas: {CAT} (Categoría), {YEAR} (Año actual), {CORRELATIVO} (Número incremental).',
    },
  });
  console.log('⚙️ Configuración del sistema creada.');

  // 3. Crear cuentas de Operadores de Sistema (para Login)
  const adminHash = await bcrypt.hash('admin123', SALT_ROUNDS);
  const userHash  = await bcrypt.hash('user123', SALT_ROUNDS);
  const henryHash = await bcrypt.hash('upen2025', SALT_ROUNDS);

  await prisma.usuario.create({
    data: {
      nombre: 'Ing. Alejandro Solís',
      correo: 'admin@upen.edu.mx',
      rol: 'ADMINISTRADOR',
      password_hash: adminHash,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: 'Lic. Laura Méndez',
      correo: 'auxiliar@upen.edu.mx',
      rol: 'USUARIO',
      password_hash: userHash,
    },
  });

  await prisma.usuario.create({
    data: {
      nombre: 'Henry Hernandez',
      correo: 'ing.sistemas@upnay.edu.mx',
      rol: 'ADMINISTRADOR',
      password_hash: henryHash,
    },
  });
  console.log('👤 Cuentas de operadores de sistema creadas (admin@upen.edu.mx / auxiliar@upen.edu.mx / ing.sistemas@upnay.edu.mx).');

  // 4. Crear Departamentos Administrativos
  const d1 = await prisma.departamento.create({ data: { nombre: 'Rectoría y Planeación', jefe: 'Mtra. Sofía Rodríguez' } });
  const d2 = await prisma.departamento.create({ data: { nombre: 'Sistemas y Soporte Técnico', jefe: 'Ing. Alejandro Solís' } });
  const d3 = await prisma.departamento.create({ data: { nombre: 'Ciencias e Ingeniería', jefe: 'Dr. Manuel García' } });
  const d4 = await prisma.departamento.create({ data: { nombre: 'Administración y Finanzas', jefe: 'Lic. Martha Pérez' } });
  console.log('🏢 Departamentos administrativos creados.');

  // 5. Crear Directorio de Personal de la Universidad (Resguardantes potenciales)
  const p1 = await prisma.personal.create({ data: { nombre: 'Ing. Alejandro Solís', correo: 'a.solis@upen.edu.mx', puesto: 'Coordinador de Soporte', departamentoId: d2.id } });
  const p2 = await prisma.personal.create({ data: { nombre: 'Lic. Laura Méndez', correo: 'l.mendez@upen.edu.mx', puesto: 'Encargada de Bienes', departamentoId: d4.id } });
  const p3 = await prisma.personal.create({ data: { nombre: 'Dr. Manuel García', correo: 'm.garcia@upen.edu.mx', puesto: 'Coordinador de Mecatrónica', departamentoId: d3.id } });
  const p4 = await prisma.personal.create({ data: { nombre: 'Mtra. Sofía Rodríguez', correo: 's.rodriguez@upen.edu.mx', puesto: 'Rectora', departamentoId: d1.id } });
  const p5 = await prisma.personal.create({ data: { nombre: 'Lic. Martha Pérez', correo: 'm.perez@upen.edu.mx', puesto: 'Directora Administrativa', departamentoId: d4.id } });
  const p6 = await prisma.personal.create({ data: { nombre: 'Dra. Elena Vázquez', correo: 'e.vazquez@upen.edu.mx', puesto: 'Docente Investigador', departamentoId: d3.id } });
  console.log('👥 Directorio de personal (Resguardantes) creado con éxito.');

  // 6. Crear Ubicaciones
  const u1 = await prisma.ubicacion.create({ data: { nombre: 'Laboratorio de Cómputo A', edificio: 'Edificio de Ciencias', encargado: 'Ing. Alejandro Solís' } });
  const u2 = await prisma.ubicacion.create({ data: { nombre: 'Aula 5 - Edificio B', edificio: 'Edificio B', encargado: 'Dr. Manuel García' } });
  const u3 = await prisma.ubicacion.create({ data: { nombre: 'Rectoría y Oficinas Administrativas', edificio: 'Edificio Administrativo', encargado: 'Mtra. Sofía Rodríguez' } });
  const u4 = await prisma.ubicacion.create({ data: { nombre: 'Biblioteca General', edificio: 'Edificio C', encargado: 'Lic. Martha Pérez' } });
  console.log('🏫 Ubicaciones universitarias creadas.');

  // 7. Crear Categorías
  const c1 = await prisma.categoria.create({ data: { nombre: 'Computadoras de Escritorio', descripcion: 'Equipos de escritorio, torres y todo-en-uno' } });
  const c2 = await prisma.categoria.create({ data: { nombre: 'Laptops', descripcion: 'Equipos portátiles para docentes y administrativos' } });
  const c3 = await prisma.categoria.create({ data: { nombre: 'Monitores', descripcion: 'Pantallas de visualización de PC' } });
  const c4 = await prisma.categoria.create({ data: { nombre: 'Drones', descripcion: 'Equipo aéreo para prácticas de ingeniería' } });
  const c5 = await prisma.categoria.create({ data: { nombre: 'Equipo de Redes', descripcion: 'Switches, routers, antenas y access points' } });
  const c6 = await prisma.categoria.create({ data: { nombre: 'Impresoras y Escáners', descripcion: 'Equipos de impresión y digitalización de documentos' } });
  console.log('🏷️ Categorías tecnológicas creadas.');

  // 8. Crear Bienes Tecnológicos
  const b1 = await prisma.bien.create({
    data: {
      codigo_inventario: 'UPEN-COMP-2026-0001',
      numero_serie: 'MXL54321AB',
      marca: 'HP',
      modelo: 'ProDesk 600 G6',
      estado: 'Activo',
      descripcion: 'Computadora de escritorio para el laboratorio de cómputo.',
      fecha_adquisicion: new Date('2024-05-15'),
      valor_estimado: 18500.0,
      categoriaId: c1.id,
      ubicacionId: u1.id,
      especificaciones: {
        procesador: 'Intel Core i5 10th Gen',
        ram: '16 GB DDR4',
        almacenamiento: '512 GB SSD NVMe',
        sistema_operativo: 'Windows 11 Pro',
      },
    },
  });

  const b2 = await prisma.bien.create({
    data: {
      codigo_inventario: 'UPEN-LAPT-2026-0002',
      numero_serie: 'C02F1234QWER',
      marca: 'Apple',
      modelo: 'MacBook Air M2',
      estado: 'Activo',
      descripcion: 'Laptop asignada a Rectoría para labores de gestión.',
      fecha_adquisicion: new Date('2025-01-10'),
      valor_estimado: 24999.0,
      categoriaId: c2.id,
      ubicacionId: u3.id,
      especificaciones: {
        procesador: 'Apple M2 (8 núcleos)',
        ram: '8 GB LPDDR5',
        almacenamiento: '256 GB SSD',
        pantalla: '13.6 pulgadas Liquid Retina',
      },
    },
  });

  const b3 = await prisma.bien.create({
    data: {
      codigo_inventario: 'UPEN-DRON-2026-0003',
      numero_serie: 'DJI321098765',
      marca: 'DJI',
      modelo: 'Mavic 3 Enterprise',
      estado: 'En reserva',
      descripcion: 'Dron especializado para fotogrametría y prácticas de ingeniería.',
      fecha_adquisicion: new Date('2023-11-20'),
      valor_estimado: 75000.0,
      categoriaId: c4.id,
      ubicacionId: u1.id,
      especificaciones: {
        camara: 'Hasselblad 4/3 CMOS',
        autonomia_vuelo: '45 minutos',
        sensores: 'Omnidireccional anticolisión',
        peso: '915 gramos',
      },
    },
  });

  const b4 = await prisma.bien.create({
    data: {
      codigo_inventario: 'UPEN-NETW-2026-0004',
      numero_serie: 'FCN2244Y12A',
      marca: 'Cisco',
      modelo: 'Catalyst 9300 24-Port',
      estado: 'Mantenimiento',
      descripcion: 'Switch troncal para la red del edificio de ciencias.',
      fecha_adquisicion: new Date('2022-03-05'),
      valor_estimado: 45000.0,
      categoriaId: c5.id,
      ubicacionId: u1.id,
      especificaciones: {
        puertos: '24 puertos Gigabit Ethernet',
        uplinks: '4x 10G SFP+',
        capa: 'Capa 3 (Routing)',
        poe: 'Soportado (UPOE, 820W)',
      },
    },
  });

  const b5 = await prisma.bien.create({
    data: {
      codigo_inventario: 'UPEN-MONI-2026-0005',
      numero_serie: 'CN4390021A',
      marca: 'Dell',
      modelo: 'P2723QE',
      estado: 'Activo',
      descripcion: 'Monitor profesional 4K USB-C.',
      fecha_adquisicion: new Date('2024-09-08'),
      valor_estimado: 9500.0,
      categoriaId: c3.id,
      ubicacionId: u3.id,
      especificaciones: {
        tamano: '27 pulgadas',
        resolucion: '4K UHD (3840x2160)',
        puertos: 'HDMI, DisplayPort, USB-C (90W Power Delivery)',
      },
    },
  });
  console.log('💻 Bienes tecnológicos de prueba creados.');

  // 9. Crear Asignaciones de prueba (Vinculando Bienes a Personal real)
  await prisma.asignacion.create({
    data: {
      fecha_asignacion: new Date('2025-01-15'),
      observaciones: 'Entregado en Rectoría, con cargador y funda protectora.',
      estado_entrega: 'Activo',
      bienId: b2.id,
      personalId: p4.id, // Mtra. Sofía Rodríguez (Rectora)
    },
  });

  await prisma.asignacion.create({
    data: {
      fecha_asignacion: new Date('2024-06-01'),
      observaciones: 'Instalado para la administración del laboratorio.',
      estado_entrega: 'Activo',
      bienId: b1.id,
      personalId: p1.id, // Ing. Alejandro Solís (Sistemas)
    },
  });

  await prisma.asignacion.create({
    data: {
      fecha_asignacion: new Date('2023-11-22'),
      observaciones: 'Para prácticas aéreas de la carrera de ingeniería.',
      estado_entrega: 'Activo',
      bienId: b3.id,
      personalId: p3.id, // Dr. Manuel García (Coordinador)
    },
  });

  console.log('📝 Historial de asignaciones patrimoniales creado.');
  console.log('🎉 ¡Siembra de base de datos finalizada con éxito! Base estructurada lista.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la siembra de base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
