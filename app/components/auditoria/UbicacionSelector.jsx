'use client';
import { useState, useMemo } from 'react';
import { DynamicIcon } from '@/lib/icons';

/**
 * UbicacionSelector — Paso 1 de la Auditoría.
 * Permite buscar y seleccionar la ubicación física a auditar.
 */
export default function UbicacionSelector({ ubicaciones = [], bienes = [], onSelect }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Calcular cantidad de bienes activos por ubicación
  const expectedCounts = useMemo(() => {
    const counts = {};
    bienes.forEach(b => {
      if (!b.eliminado) {
        counts[b.ubicacionId] = (counts[b.ubicacionId] || 0) + 1;
      }
    });
    return counts;
  }, [bienes]);

  // Filtrar ubicaciones por nombre, edificio o encargado
  const filteredUbicaciones = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return ubicaciones;
    return ubicaciones.filter(u => 
      (u.nombre || '').toLowerCase().includes(query) ||
      (u.edificio || '').toLowerCase().includes(query) ||
      (u.encargado || '').toLowerCase().includes(query)
    );
  }, [ubicaciones, searchTerm]);

  return (
    <div className="fade-in" style={{ padding: '20px 0' }}>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Selecciona una Ubicación Física
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxW: 500, margin: '0 auto' }}>
          Elige el espacio o laboratorio que vas a verificar físicamente para iniciar la conciliación de activos.
        </p>
      </div>

      {/* Buscador de Ubicaciones */}
      <div style={{ maxWidth: 500, margin: '0 auto 24px', display: 'flex', gap: 10 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: 40,
              fontSize: 14,
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)'
            }}
            placeholder="Buscar por nombre, edificio o responsable..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
            🔍
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                color: 'var(--text-secondary)'
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Grid de Ubicaciones */}
      {filteredUbicaciones.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '48px 20px',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px dashed var(--border)',
          color: 'var(--text-secondary)'
        }}>
          <span style={{ fontSize: 32, display: 'block', marginBottom: 12 }}>🏫</span>
          <p style={{ fontWeight: 600, margin: 0 }}>No se encontraron ubicaciones</p>
          <p style={{ fontSize: 12, margin: '4px 0 0' }}>Prueba con otro término de búsqueda</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginTop: 12
        }}>
          {filteredUbicaciones.map(u => {
            const count = expectedCounts[u.id] || 0;
            return (
              <div
                key={u.id}
                onClick={() => onSelect(u)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
                className="ubicacion-card-hover"
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      background: 'var(--bg-body)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      border: '1px solid var(--border)'
                    }}>
                      <DynamicIcon name={u.icono || '🏫'} size={20} style={{ color: 'var(--primary)' }} />
                    </div>
                    <span className="badge" style={{
                      background: count > 0 ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-body)',
                      color: count > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                      borderColor: count > 0 ? 'rgba(99, 102, 241, 0.2)' : 'var(--border)',
                      fontWeight: 700,
                      fontSize: 11,
                      padding: '4px 10px'
                    }}>
                      {count} {count === 1 ? 'equipo' : 'equipos'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                    {u.nombre}
                  </h3>
                  
                  {u.edificio && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>🏢</span> {u.edificio}
                    </div>
                  )}
                </div>

                <div style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--text-secondary)'
                }}>
                  <span>Responsable:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {u.encargado || 'Sin asignar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Estilos locales para hover effects */}
      <style jsx global>{`
        .ubicacion-card-hover:hover {
          transform: translateY(-4px);
          border-color: var(--primary) !important;
          box-shadow: 0 12px 24px rgba(0,0,0,0.06), 0 2px 4px rgba(99, 102, 241, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
