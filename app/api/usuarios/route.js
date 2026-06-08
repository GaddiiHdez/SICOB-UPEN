import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const usuarios = await prisma.usuario.findMany({
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true
      }
    });
    return NextResponse.json(usuarios);
  } catch (error) {
    console.error('❌ Error en GET /api/usuarios:', error);
    return NextResponse.json({ error: 'Error al listar los usuarios.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, correo, rol, password } = body;

    if (!nombre || !correo) return NextResponse.json({ error: 'Nombre y correo son requeridos.' }, { status: 400 });

    const duplicado = await prisma.usuario.findUnique({ where: { correo } });
    if (duplicado) return NextResponse.json({ error: `El correo '${correo}' ya está en uso.` }, { status: 400 });

    // Habilitar acceso en texto plano con un password opcional o default 'upen123'
    const passwordStr = password || 'upen123';
    const passwordHash = await hashPassword(passwordStr);

    const nuevo = await prisma.usuario.create({
      data: { 
        nombre, 
        correo, 
        rol: rol || 'USUARIO',
        password_hash: passwordHash
      },
      select: { id: true, nombre: true, correo: true, rol: true }
    });
    return NextResponse.json(nuevo);
  } catch (error) {
    console.error('❌ Error en POST /api/usuarios:', error);
    return NextResponse.json({ error: 'Error al crear el usuario.' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, nombre, correo, rol, password } = body;

    if (!id || !nombre || !correo) return NextResponse.json({ error: 'ID, nombre y correo son requeridos.' }, { status: 400 });

    const duplicado = await prisma.usuario.findFirst({
      where: { correo, id: { not: parseInt(id) } }
    });
    if (duplicado) return NextResponse.json({ error: `El correo '${correo}' ya está en uso por otra persona.` }, { status: 400 });

    const dataUpdate = { nombre, correo, rol };
    if (password && password.trim() !== '') {
      dataUpdate.password_hash = await hashPassword(password);
    }

    const actualizado = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: dataUpdate,
      select: { id: true, nombre: true, correo: true, rol: true }
    });
    return NextResponse.json(actualizado);
  } catch (error) {
    console.error('❌ Error en PUT /api/usuarios:', error);
    return NextResponse.json({ error: 'Error al actualizar el usuario.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'El ID es requerido.' }, { status: 400 });

    const idInt = parseInt(id);
    await prisma.usuario.delete({ where: { id: idInt } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error en DELETE /api/usuarios:', error);
    return NextResponse.json({ error: 'Error al eliminar el usuario de acceso.' }, { status: 500 });
  }
}
