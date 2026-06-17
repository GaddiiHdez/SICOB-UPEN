'use client';
import { useState, useEffect } from 'react';
import CatalogManager from './CatalogManager';
import UbicacionesManager from './UbicacionesManager';

/**
 * CatalogsPanel — Panel Unificado de Catálogos Auxiliares
 * Agrupa Áreas, Departamentos, Categorías y Responsables bajo una hermosa
 * interfaz de sub-pestañas con diseño moderno y transiciones pulidas.
 */
export default function CatalogsPanel({ showToast, isAdmin = false }) {
  const [activeTab, setActiveTab] = useState('areas');
  const [ubicaciones, setUbicaciones] = useState([]);
  const [personal, setPersonal] = useState([]);

  useEffect(() => {
    let active = true;
    fetch('/api/ubicaciones')
      .then(res => res.json())
      .then(data => {
        if (active) setUbicaciones(data);
      })
      .catch(err => console.error("Error al cargar ubicaciones en catálogos:", err));

    fetch('/api/personal')
      .then(res => res.json())
      .then(data => {
        if (active) setPersonal(data);
      })
      .catch(err => console.error("Error al cargar personal en catálogos:", err));

    return () => {
      active = false;
    };
  }, []);

  const tabs = [
    { id: 'areas',                  label: 'Áreas / Ubicaciones',    icon: '🏫', desc: 'Edificios, salones y bodegas' },
    { id: 'departamentos',          label: 'Departamentos y Coordinaciones', icon: '🏢', desc: 'Organigrama institucional' },
    { id: 'categorias',             label: 'Categorías de Bienes',   icon: '🏷️', desc: 'Familias de equipos' },
    { id: 'categorias_inmobiliario', label: 'Categorías de Mobiliario', icon: '🪑', desc: 'Familias de mobiliario' },
    { id: 'categorias_consumibles',  label: 'Categorías de Consumibles', icon: '📦', desc: 'Familias de consumibles' },
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      
      {/* Cabecera del Panel Unificado */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        <div>
          <div className="content-panel-label">Administración del Sistema</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>
            Catálogos de Referencia
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
            Administra las tablas maestras que alimentan los menús y la lógica operativa del inventario.
          </p>
        </div>

        {/* Selector de sub-pestañas */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px'
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid ' + (isActive ? 'var(--primary)' : 'transparent'),
                  background: isActive ? 'rgba(13, 148, 136, 0.1)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '13px',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                }}
                className="catalog-tab-button"
              >
                <span style={{ fontSize: '16px' }}>{tab.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ lineHeight: '1.2' }}>{tab.label}</div>
                  <div style={{ fontSize: '10px', opacity: 0.7, fontWeight: '400', marginTop: 2 }}>{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderizado Dinámico de los Catálogos correspondientes */}
      <div 
        className="fade-in"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden'
        }}
      >
        {activeTab === 'areas' && (
          <UbicacionesManager showToast={showToast} isAdmin={isAdmin} />
        )}

        {activeTab === 'departamentos' && (
          <CatalogManager 
            title="Departamentos y Coordinaciones" 
            subtitle="Unidades, departamentos y coordinaciones del organigrama institucional" 
            icon="🏢" 
            endpoint="/api/departamentos"
            isAdmin={isAdmin}
            fields={[
              { name: 'nombre', label: 'Nombre del Departamento o Coordinación', required: true },
              { 
                name: 'jefe', 
                label: 'Titular / Jefe o Coordinador',
                type: 'select',
                options: personal.map(p => ({ value: p.nombre, label: `${p.nombre} (${p.puesto || 'Sin puesto'})` }))
              },
              { 
                name: 'ubicacionId', 
                label: 'Ubicación física de la Oficina', 
                type: 'select',
                options: ubicaciones.map(u => ({ value: String(u.id), label: `${u.nombre} (Edif. ${u.edificio || 'General'})` }))
              },
              { name: 'icono', label: 'Icono / Emoji Distintivo', defaultValue: '🏢', type: 'emoji' }
            ]}
          />
        )}

        {activeTab === 'categorias' && (
          <CatalogManager 
            title="Categorías de Bienes" 
            subtitle="Familias de clasificación patrimonial y especificaciones" 
            icon="🏷️" 
            endpoint="/api/categorias"
            isAdmin={isAdmin}
            fields={[
              { name: 'nombre', label: 'Nombre de la Categoría', required: true },
              { name: 'descripcion', label: 'Descripción de los Equipos', type: 'textarea' },
              { name: 'icono', label: 'Icono / Emoji Distintivo', defaultValue: '🏷️', type: 'emoji' }
            ]}
          />
        )}

        {activeTab === 'categorias_inmobiliario' && (
          <CatalogManager 
            title="Categorías de Mobiliario" 
            subtitle="Familias de clasificación de mobiliario e inmobiliario" 
            icon="🪑" 
            endpoint="/api/categorias-inmobiliario"
            isAdmin={isAdmin}
            fields={[
              { name: 'nombre', label: 'Nombre de la Categoría', required: true },
              { name: 'descripcion', label: 'Descripción de los Artículos', type: 'textarea' },
              { name: 'icono', label: 'Icono / Emoji Distintivo', defaultValue: '🪑', type: 'emoji' }
            ]}
          />
        )}

        {activeTab === 'categorias_consumibles' && (
          <CatalogManager 
            title="Categorías de Consumibles" 
            subtitle="Familias de clasificación de consumibles y suministros" 
            icon="📦" 
            endpoint="/api/categorias-consumibles"
            isAdmin={isAdmin}
            fields={[
              { name: 'nombre', label: 'Nombre de la Categoría', required: true },
              { name: 'descripcion', label: 'Descripción de los Suministros', type: 'textarea' },
              { name: 'icono', label: 'Icono / Emoji Distintivo', defaultValue: '📦', type: 'emoji' }
            ]}
          />
        )}
      </div>
    </div>
  );
}
