'use client';
import { NAV_ITEMS } from '@/lib/constants';

/**
 * Sidebar — Navegación lateral del sistema.
 * Muestra el logotipo institucional y el acrónimo configurado en la base de datos de PostgreSQL en tiempo real.
 */
export default function Sidebar({ activeNav, onNavChange, usuario, configuracion = {}, isOpen, onLogout }) {
  const logo = configuracion.logo_institucion;
  const siglas = configuracion.siglas_institucion || 'UPEN';

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      {/* Logo / Marca Institucional */}
      <div className="sidebar-logo">
        {logo ? (
          <div style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            borderRadius: 6,
            overflow: 'hidden',
            padding: 2,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            flexShrink: 0
          }}>
            <img src={logo} alt="Logo Institucional" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : (
          <div className="sidebar-logo-icon" style={{ background: 'transparent', padding: '2px' }}>
            <img src="/sicob-logo.png" alt="SICOB Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        )}
        <div className="sidebar-logo-text">
          <h1>SICOB {siglas}</h1>
          <p>Control y Operación de Bienes</p>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="sidebar-nav">
        <style dangerouslySetInnerHTML={{ __html: `
          .sidebar .nav-item {
            transition: all 0.15s ease !important;
          }
          .sidebar .nav-item:hover {
            background: #FFFFFF !important;
            color: #121212 !important;
          }
          .sidebar .nav-item.active {
            background: #00716A !important;
            color: #FFFFFF !important;
            font-weight: 600 !important;
          }
          .sidebar .nav-item.active:hover {
            background: #FFFFFF !important;
            color: #121212 !important;
          }
          .sidebar .sidebar-user-action-btn:hover {
            background: #FFFFFF !important;
            color: #121212 !important;
          }
          .sidebar .sidebar-user-action-btn.active {
            background: #00716A !important;
            color: #FFFFFF !important;
            font-weight: 600 !important;
          }
          .sidebar .sidebar-user-action-btn.active:hover {
            background: #FFFFFF !important;
            color: #121212 !important;
          }
        `}} />
        {NAV_ITEMS.map(item => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => onNavChange(item.id)}
              style={isActive ? {
                background: '#00716A',
                color: '#FFFFFF',
                fontWeight: 600,
                outline: 'none',
                border: 'none',
                boxShadow: 'none'
              } : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Información del usuario y acciones al fondo */}
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{usuario?.nombre ?? 'Administrador'}</div>
          <div style={{ fontSize: 10, color: 'var(--sidebar-text)', opacity: 0.6, marginTop: 2 }}>
            {usuario?.rol === 'ADMINISTRADOR' ? 'Administrador General' : 'Usuario de Consulta'}
          </div>
        </div>
        <div className="sidebar-user-actions">
          {usuario?.rol === 'ADMINISTRADOR' && (
            <button
              className={`sidebar-user-action-btn${activeNav === 'configuracion' ? ' active' : ''}`}
              onClick={() => onNavChange('configuracion')}
              style={activeNav === 'configuracion' ? {
                background: '#00716A',
                color: '#FFFFFF',
                fontWeight: 600,
                outline: 'none',
                border: 'none',
                boxShadow: 'none'
              } : undefined}
            >
              <span>⚙️</span> Configuración
            </button>
          )}
          <button
            className="sidebar-user-action-btn sidebar-user-action-btn-danger"
            onClick={() => {
              if (onLogout) onLogout();
            }}
          >
            <span>⏻</span> Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
