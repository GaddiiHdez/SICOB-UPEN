'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('Captured by global Error Boundary:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-main, #F3F4F6)',
      color: 'var(--text-primary, #111827)',
      padding: 24,
      textAlign: 'center',
      gap: 20
    }}>
      <div style={{ fontSize: 72 }}>⚙️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800 }}>Algo salió mal en el sistema</h2>
      <p style={{ fontSize: 14.5, color: 'var(--text-secondary, #4B5563)', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
        SICOB detectó un error inesperado al procesar la interfaz. Puedes intentar recargar el componente para solucionar el problema.
      </p>
      {error && (
        <code style={{
          fontSize: 11.5,
          background: 'var(--bg-card, #FFFFFF)',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid var(--border, #E5E7EB)',
          maxWidth: '500px',
          wordBreak: 'break-all',
          fontFamily: 'monospace',
          color: '#EF4444'
        }}>
          {error.message || String(error)}
        </code>
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button 
          type="button" 
          className="btn btn-ghost"
          style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)' }}
          onClick={() => window.location.reload()}
        >
          Recargar Página
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          style={{ padding: '8px 16px', borderRadius: 8, fontWeight: 600 }}
          onClick={() => reset()}
        >
          🔄 Reintentar Componente
        </button>
      </div>
    </div>
  );
}
