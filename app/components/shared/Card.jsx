'use client';

/**
 * Card — Contenedor tipo tarjeta compartido
 *
 * Reemplaza el objeto de estilos de "card shell" que se copy-pastea
 * 8+ veces en ConfiguracionPanel.jsx y otros componentes.
 *
 * @param {React.ReactNode} children
 * @param {React.CSSProperties} style - Estilos adicionales opcionales
 * @param {string} className - Clases CSS adicionales
 */
export default function Card({ children, style = {}, className = '' }) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        ...style
      }}
    >
      {children}
    </div>
  );
}
