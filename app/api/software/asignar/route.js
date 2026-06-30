import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Asignar software a un equipo o a un laboratorio completo
export async function POST(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const body = await request.json();
    const { softwareId, bienId, laboratorioId, observaciones, licenciaKey, vencimientoLicencia } = body;

    if (!softwareId) {
      return NextResponse.json({ error: 'El ID del software es obligatorio.' }, { status: 400 });
    }

    const sId = parseInt(softwareId, 10);
    const bId = bienId ? parseInt(bienId, 10) : null;
    const lId = laboratorioId ? parseInt(laboratorioId, 10) : null;

    if (!bId && !lId) {
      return NextResponse.json({ error: 'Debe especificar un ID de equipo (bienId) o un ID de laboratorio (laboratorioId).' }, { status: 400 });
    }

    // Verificar si ya existe la asignación
    if (bId) {
      const existente = await prisma.softwareInstalacion.findFirst({
        where: { softwareId: sId, bienId: bId }
      });
      if (existente) {
        return NextResponse.json({ error: 'Este software ya está asignado a este equipo.' }, { status: 400 });
      }

      const nuevaAsignacion = await prisma.softwareInstalacion.create({
        data: {
          softwareId: sId,
          bienId: bId,
          licenciaKey: licenciaKey || null,
          vencimientoLicencia: vencimientoLicencia ? new Date(vencimientoLicencia) : null,
          observaciones: observaciones || null
        }
      });
      return NextResponse.json(nuevaAsignacion);
    } else {
      const existente = await prisma.softwareInstalacion.findFirst({
        where: { softwareId: sId, laboratorioId: lId }
      });
      if (existente) {
        return NextResponse.json({ error: 'Este software ya está asignado a este laboratorio.' }, { status: 400 });
      }

      const nuevaAsignacion = await prisma.softwareInstalacion.create({
        data: {
          softwareId: sId,
          laboratorioId: lId,
          observaciones: observaciones || null
        }
      });
      return NextResponse.json(nuevaAsignacion);
    }
  } catch (error) {
    console.error('❌ Error en POST /api/software/asignar:', error);
    return NextResponse.json({ error: 'Error al asignar el software.' }, { status: 500 });
  }
}

// Remover la asignación de un software
export async function DELETE(request) {
  try {
    const { user, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado. Se requieren permisos de administrador.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const softwareId = searchParams.get('softwareId');
    const bienId = searchParams.get('bienId');
    const laboratorioId = searchParams.get('laboratorioId');

    if (!softwareId) {
      return NextResponse.json({ error: 'El ID del software es obligatorio.' }, { status: 400 });
    }

    const sId = parseInt(softwareId, 10);
    const bId = bienId ? parseInt(bienId, 10) : null;
    const lId = laboratorioId ? parseInt(laboratorioId, 10) : null;

    if (!bId && !lId) {
      return NextResponse.json({ error: 'Debe especificar un ID de equipo (bienId) o un ID de laboratorio (laboratorioId).' }, { status: 400 });
    }

    if (bId) {
      const registro = await prisma.softwareInstalacion.findFirst({
        where: { softwareId: sId, bienId: bId }
      });
      if (!registro) {
        return NextResponse.json({ error: 'No se encontró la asignación de software especificada.' }, { status: 404 });
      }
      await prisma.softwareInstalacion.delete({
        where: { id: registro.id }
      });
    } else {
      const registro = await prisma.softwareInstalacion.findFirst({
        where: { softwareId: sId, laboratorioId: lId }
      });
      if (!registro) {
        return NextResponse.json({ error: 'No se encontró la asignación de software especificada.' }, { status: 404 });
      }
      await prisma.softwareInstalacion.delete({
        where: { id: registro.id }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/software/asignar:', error);
    return NextResponse.json({ error: 'Error al remover la asignación de software.' }, { status: 500 });
  }
}
