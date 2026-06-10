'use client';
import { useState, useCallback, useEffect } from 'react';
import { TIPOS_EQUIPO } from '@/lib/constants';

/**
 * useInventarioData — Hook de datos del inventario
 *
 * Centraliza la carga de los 8 endpoints del sistema y la transformación
 * del modelo de datos de Prisma al modelo de vista usado en toda la UI.
 * Antes vivía como `fetchData` + `bienesTransformados` inline en page.js (líneas 88–161).
 *
 * @param {boolean} isAuthenticated - Solo carga datos cuando el usuario está autenticado.
 * @param {Function} showToast - Callback para mostrar notificaciones.
 * @returns {{ bienes, categorias, ubicaciones, departamentos, usuarios, personal, configuracion, mantenimientos, isLoading, fetchData }}
 */
export function useInventarioData(isAuthenticated, showToast) {
  const [bienes,        setBienes]        = useState([]);
  const [categorias,    setCategorias]    = useState([]);
  const [ubicaciones,   setUbicaciones]   = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [usuarios,      setUsuarios]      = useState([]);
  const [personal,      setPersonal]      = useState([]);
  const [configuracion, setConfiguracion] = useState({});
  const [mantenimientos,setMantenimientos]= useState([]);
  const [isLoading,     setIsLoading]     = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        resBienes, resCategorias, resUbicaciones, resDepartamentos,
        resUsuarios, resPersonal, resConfig, resMantenimientos
      ] = await Promise.all([
        fetch(`/api/bienes?incluirEliminados=true&_=${Date.now()}`, { cache: 'no-store' }),
        fetch('/api/categorias'),
        fetch('/api/ubicaciones'),
        fetch('/api/departamentos'),
        fetch('/api/usuarios'),
        fetch('/api/personal'),
        fetch('/api/configuracion'),
        fetch('/api/mantenimientos')
      ]);

      if (!resBienes.ok) throw new Error('Error al cargar inventario');

      const dataBienes        = await resBienes.json();
      const dataCategorias    = await resCategorias.json();
      const dataUbicaciones   = await resUbicaciones.json();
      const dataDepartamentos = await resDepartamentos.json();
      const dataUsuarios      = await resUsuarios.json();
      const dataPersonal      = await resPersonal.json();
      const dataConfig        = await resConfig.json();
      const dataMantenimientos = resMantenimientos.ok ? await resMantenimientos.json() : [];

      // Transformar modelo Prisma → modelo de vista
      const bienesTransformados = dataBienes.map(b => ({
        id:             b.id,
        marca:          b.marca,
        modelo:         b.modelo,
        nombre:         `${b.marca} ${b.modelo}`,
        tipo:           b.categoria?.nombre || 'Otro',
        serial:         b.numero_serie,
        etiqueta:       b.codigo_inventario,
        estado:         b.eliminado ? 'Baja' : b.estado,
        area:           b.ubicacion?.nombre || 'Desconocida',
        departamento:   b.departamento?.nombre || 'Sin departamento',
        departamentoIcono:     b.departamento?.icono || '🏢',
        departamentoUbicacion: b.departamento?.ubicacion
          ? { id: b.departamento.ubicacion.id, nombre: b.departamento.ubicacion.nombre,
              edificio: b.departamento.ubicacion.edificio, icono: b.departamento.ubicacion.icono }
          : null,
        responsable:  b.eliminado ? 'Sin asignar'
          : (b.asignaciones?.[0]?.fecha_retorno ? 'Sin asignar'
          : (b.asignaciones?.[0]?.personal?.nombre || 'Sin asignar')),
        responsableId: b.eliminado ? ''
          : (b.asignaciones?.[0]?.fecha_retorno ? ''
          : (b.asignaciones?.[0]?.personal?.id || '')),
        icono:             b.categoria?.icono || TIPOS_EQUIPO[b.categoria?.nombre] || '🔧',
        categoria:         b.categoria?.nombre,
        categoriaId:       b.categoriaId,
        ubicacionId:       b.ubicacionId,
        departamentoId:    b.departamentoId,
        descripcion:       b.descripcion || '',
        especificaciones:  b.especificaciones || {},
        fecha_adquisicion: b.fecha_adquisicion,
        programa_adquisicion: b.programa_adquisicion,
        valor_estimado:    b.valor_estimado,
        imagen_url:        b.imagen_url,
        eliminado:         b.eliminado,
        eliminadoEn:       b.eliminadoEn,
        createdAt:         b.createdAt,
        updatedAt:         b.updatedAt,
        fechaAsignacion:   b.asignaciones?.[0]?.fecha_asignacion || null
      }));

      setBienes(bienesTransformados);
      setCategorias(dataCategorias);
      setUbicaciones(dataUbicaciones);
      setDepartamentos(dataDepartamentos);
      setUsuarios(dataUsuarios);
      setPersonal(dataPersonal);
      setConfiguracion(dataConfig);
      setMantenimientos(dataMantenimientos);
    } catch (error) {
      console.error(error);
      if (showToast) showToast('Error de conexión con la base de datos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Carga inicial cuando el usuario se autentica
  useEffect(() => {
    let active = true;
    if (isAuthenticated) {
      Promise.resolve().then(() => {
        if (active) fetchData();
      });
    }
    return () => { active = false; };
  }, [isAuthenticated, fetchData]);

  return {
    bienes, categorias, ubicaciones, departamentos,
    usuarios, personal, configuracion, mantenimientos,
    isLoading, fetchData
  };
}
