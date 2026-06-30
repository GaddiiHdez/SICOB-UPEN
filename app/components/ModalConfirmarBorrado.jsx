'use client';
import { useState, useRef, useEffect } from 'react';
import { DynamicIcon } from '@/lib/icons';

/**
 * ModalConfirmarBorrado — Ventana emergente premium para autorizar el borrado permanente de activos.
 * Muestra un signo de advertencia animado, un mensaje claro sobre la irreversibilidad
 * de la acción y solicita la contraseña de administrador para proceder.
 */
export default function ModalConfirmarBorrado({ bien, onClose, onConfirm, isLoading }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // Auto-enfocar el campo de contraseña al abrir el modal
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!password.trim()) {
      setError('Por favor, ingresa tu contraseña para continuar.');
      return;
    }

    onConfirm(password);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(5px)' }}>
      <div 
        className="modal-box" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: 420, 
          width: '90%', 
          borderRadius: 16, 
          border: '1px solid var(--border)', 
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        
        {/* Banner de Advertencia Animado */}
        <div style={{
          background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Signo de advertencia premium */}
          <div className="warning-pulse-container" style={{ marginBottom: 12 }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: '#FFFFFF' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, textTransform: 'uppercase' }}>
            Acción Irreversible
          </h3>
          <span style={{ fontSize: 11, opacity: 0.9, marginTop: 4, fontWeight: 500 }}>
            Se requiere autorización de administrador
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Detalles del Bien a Borrar */}
            <div style={{
              background: 'var(--bg-body, #F3F4F6)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DynamicIcon name={bien?.icono || '💻'} size={24} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{bien?.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  No. Inv: {bien?.etiqueta?.startsWith('SIN-NUMERO-') ? 'S/N' : bien?.etiqueta} | Serie: {bien?.serial}
                </div>
              </div>
            </div>

            {/* Mensaje de Advertencia */}
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
              Esta operación eliminará de forma permanente este bien tecnológico y todo su historial de resguardos y mantenimientos. <strong>Esta acción NO se puede deshacer.</strong>
            </p>

            {/* Input de Contraseña */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>
                Ingresa tu contraseña de administrador:
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'} 
                  className="form-input" 
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Contraseña"
                  disabled={isLoading}
                  style={{ 
                    paddingRight: 40, 
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    borderColor: error ? '#EF4444' : 'var(--border)'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 16,
                    padding: 0,
                    color: 'var(--text-secondary)',
                    opacity: 0.7
                  }}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
              {error && (
                <span style={{ fontSize: 11, color: '#EF4444', fontWeight: 600, marginTop: 2 }}>
                  ⚠️ {error}
                </span>
              )}
            </div>

          </div>

          <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--bg-body, #F9FAFB)', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-ghost" 
              onClick={onClose}
              disabled={isLoading}
              style={{ padding: '8px 16px', borderRadius: 8 }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn" 
              disabled={isLoading}
              style={{ 
                background: '#EF4444', 
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 8,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <>
                  <span className="dash-pulse" style={{ width: 10, height: 10, backgroundColor: '#FFFFFF' }}></span>
                  Eliminando...
                </>
              ) : (
                <>
                  🗑️ Confirmar Borrado
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      <style jsx global>{`
        @keyframes warning-glowing {
          0% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { transform: scale(1); opacity: 0.9; box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .warning-pulse-container {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          animation: warning-glowing 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
