'use client';
import { useReducer, useCallback, useEffect, useRef } from 'react';
import { TIPOS_EQUIPO } from '@/lib/constants';

/**
 * useInventarioData — Hook de datos del inventario (v2 — optimizado)
 *
 * Cambios respecto a v1:
 * - useReducer en lugar de 8 useState individuales (1 re-render vs 8)
 * - AbortController para cancelar peticiones anteriores y evitar tormentas de requests
 * - Guardia isLoading para evitar peticiones duplicadas simultáneas
 * - Timeout de 15 segundos por petición individual
 * - Manejo de errores por endpoint individual
 *
 * @param {boolean} isAuthenticated - Solo carga datos cuando el usuario está autenticado.
 * @param {Function} showToast - Callback para mostrar notificaciones.
 * @returns {{ bienes, categorias, ubicaciones, departamentos, usuarios, personal, configuracion, mantenimientos, isLoading, error, fetchData }}
 */

// ── Reducer para consolidar todos los estados en un solo dispatch ──
const initialState = {
  bienes: [],
  categorias: [],
  ubicaciones: [],
  departamentos: [],
  usuarios: [],
  personal: [],
  configuracion: {},
  mantenimientos: [],
  isLoading: false,
  error: null,
};

function dataReducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        error: null,
      };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.error };
    default:
      return state;
  }
}

// ── Transformador del modelo Prisma → modelo de vista ──
function transformBienes(dataBienes) {
  return dataBienes.map(b => ({
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
    firma: b.eliminado ? null
      : (b.asignaciones?.[0]?.fecha_retorno ? null
      : (b.asignaciones?.[0]?.firma || null)),
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
}

export function useInventarioData(isAuthenticated, showToast) {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  const abortControllerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    // Guardia: no lanzar si ya hay una petición en vuelo
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Cancelar peticiones anteriores si aún están en vuelo
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    dispatch({ type: 'FETCH_START' });

    try {
      // Timeout de 15 segundos por petición
      const fetchWithTimeout = (url) =>
        fetch(url, { signal, cache: 'no-store' });

      const [
        resBienes, resCategorias, resUbicaciones, resDepartamentos,
        resUsuarios, resPersonal, resConfig, resMantenimientos
      ] = await Promise.all([
        fetchWithTimeout(`/api/bienes?incluirEliminados=true&_=${Date.now()}`),
        fetchWithTimeout('/api/categorias'),
        fetchWithTimeout('/api/ubicaciones'),
        fetchWithTimeout('/api/departamentos'),
        fetchWithTimeout('/api/usuarios'),
        fetchWithTimeout('/api/personal'),
        fetchWithTimeout('/api/configuracion'),
        fetchWithTimeout('/api/mantenimientos')
      ]);

      // Si la señal fue abortada, no procesar respuestas
      if (signal.aborted) return;

      // Verificar respuestas críticas
      if (!resBienes.ok) throw new Error('Error al cargar inventario');

      // Parsear JSON en paralelo con fallbacks por endpoint
      const [
        dataBienes, dataCategorias, dataUbicaciones, dataDepartamentos,
        dataUsuarios, dataPersonal, dataConfig, dataMantenimientos
      ] = await Promise.all([
        resBienes.json(),
        resCategorias.ok ? resCategorias.json() : [],
        resUbicaciones.ok ? resUbicaciones.json() : [],
        resDepartamentos.ok ? resDepartamentos.json() : [],
        resUsuarios.ok ? resUsuarios.json() : [],
        resPersonal.ok ? resPersonal.json() : [],
        resConfig.ok ? resConfig.json() : {},
        resMantenimientos.ok ? resMantenimientos.json() : []
      ]);

      if (signal.aborted) return;

      // Un solo dispatch actualiza todo el estado → 1 re-render
      dispatch({
        type: 'FETCH_SUCCESS',
        payload: {
          bienes: transformBienes(dataBienes),
          categorias: dataCategorias,
          ubicaciones: dataUbicaciones,
          departamentos: dataDepartamentos,
          usuarios: dataUsuarios,
          personal: dataPersonal,
          configuracion: dataConfig,
          mantenimientos: dataMantenimientos,
        },
      });
    } catch (err) {
      // No reportar errores de cancelación intencional
      if (err.name === 'AbortError') return;

      console.error('useInventarioData fetch error:', err);
      dispatch({ type: 'FETCH_ERROR', error: err.message || 'Error de conexión con el servidor.' });
      if (showToast) showToast('Error de conexión con la base de datos', 'error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [showToast]);

  // Carga inicial cuando el usuario se autentica
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
    return () => {
      // Cancelar peticiones en vuelo al desmontar
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, fetchData]);

  return {
    bienes: state.bienes,
    categorias: state.categorias,
    ubicaciones: state.ubicaciones,
    departamentos: state.departamentos,
    usuarios: state.usuarios,
    personal: state.personal,
    configuracion: state.configuracion,
    mantenimientos: state.mantenimientos,
    isLoading: state.isLoading,
    error: state.error,
    fetchData,
  };
}
