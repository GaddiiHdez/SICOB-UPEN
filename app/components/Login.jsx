'use client';
import { useState } from 'react';
import Image from 'next/image';

// ── Sub-componente: Formulario de restablecimiento ─────────────────────────
function ForgotPasswordForm({ onBack }) {
  const [step, setStep] = useState(1); // 1 = ingresar datos, 2 = éxito
  const [correo, setCorreo] = useState('');
  const [token, setToken] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (nuevaPassword !== confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, token: token.trim(), nuevaPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al restablecer la contraseña');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            ¡Contraseña actualizada!
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
            Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
        </div>
        <button
          type="button"
          className="login-btn-submit"
          onClick={onBack}
        >
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Restablecer contraseña
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
          Ingresa tu correo, el código que te proporcionó el administrador, y tu nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="login-error-box">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
        {/* Correo */}
        <div className="login-field-group">
          <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Correo institucional</label>
          <div className="login-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <input
              id="reset-correo"
              type="email"
              className="login-input"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="usuario@upnay.edu.mx"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Código del admin */}
        <div className="login-field-group">
          <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Código de restablecimiento</label>
          <div className="login-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
            <input
              id="reset-token"
              type="text"
              className="login-input"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 dígitos (ej: 482916)"
              maxLength={6}
              required
              disabled={loading}
              style={{ letterSpacing: '0.3em', fontWeight: 700 }}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            El administrador del sistema te proporcionó este código.
          </p>
        </div>

        {/* Nueva contraseña */}
        <div className="login-field-group">
          <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Nueva contraseña</label>
          <div className="login-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              id="reset-nueva-password"
              type="password"
              className="login-input"
              value={nuevaPassword}
              onChange={(e) => setNuevaPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Confirmar contraseña */}
        <div className="login-field-group">
          <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Confirmar contraseña</label>
          <div className="login-input-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <input
              id="reset-confirmar-password"
              type="password"
              className="login-input"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          id="reset-submit-btn"
          type="submit"
          className="login-btn-submit"
          disabled={loading || token.length < 6}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="sync-pulse" style={{ backgroundColor: '#fff', boxShadow: 'none' }}></span>
              Verificando...
            </span>
          ) : 'Cambiar contraseña'}
        </button>

        <button
          type="button"
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'underline'
          }}
        >
          ← Volver al inicio de sesión
        </button>
      </form>
    </div>
  );
}

// ── Componente principal: Login ────────────────────────────────────────────
export default function Login({ onLoginSuccess }) {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error de autenticación');
      }

      // Si es exitoso, pasamos el usuario al componente padre
      onLoginSuccess(data.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-side fade-in">
        <div className="login-form-container">
          <div className="login-logo-wrap">
            <Image src="/sicob-logo.png" alt="SICOB Logo" width={80} height={80} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">SICOB</h1>
          <p className="login-sub">Sistema de Control y Operación de Bienes</p>

          {/* ── Vista: Formulario de restablecimiento ── */}
          {showForgot ? (
            <ForgotPasswordForm onBack={() => setShowForgot(false)} />
          ) : (
            <>
              {error && (
                <div className="login-error-box">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div className="login-field-group">
                  <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Correo electrónico</label>
                  <div className="login-input-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    <input
                      type="email"
                      className="login-input"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      placeholder="usuario@upen.edu.mx"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="login-field-group">
                  <label className="form-label" style={{ color: '#6B7280', fontWeight: 600 }}>Contraseña</label>
                  <div className="login-input-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-input-icon"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    <input
                      type="password"
                      className="login-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Enlace ¿Olvidaste tu contraseña? */}
                <div style={{ textAlign: 'right', marginTop: -10 }}>
                  <button
                    id="forgot-password-link"
                    type="button"
                    onClick={() => { setError(null); setShowForgot(true); }}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--primary)', fontSize: 12, fontWeight: 500,
                      textDecoration: 'underline', padding: 0
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                <button
                  type="submit"
                  className="login-btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="sync-pulse" style={{ backgroundColor: '#fff', boxShadow: 'none' }}></span>
                      Iniciando sesión...
                    </span>
                  ) : 'Ingresar al sistema'}
                </button>
              </form>
            </>
          )}
        </div>

        <footer className="login-footer">
          <p>© 2026 Universidad Politécnica del Estado de Nayarit. Todos los derechos reservados.</p>
          <div className="login-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Aviso de Privacidad</a>
            <span>•</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Soporte Técnico</a>
            <span>•</span>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>v1.0.0 (Estable)</span>
          </div>
        </footer>
      </div>

      <div className="login-brand-side">
        <svg 
          className="brand-watermark-building" 
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '200%',
            maxWidth: 'none',
            height: 'auto',
            opacity: 0.32,
            color: '#FFFFFF',
            filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.15))',
            zIndex: 1,
            pointerEvents: 'none'
          }}
          viewBox="0 0 400 240" 
          fill="none" 
          stroke="currentColor"
        >
          <line x1="20" y1="40" x2="120" y2="40" stroke="#ffffff" strokeWidth="1" opacity="0.1" />
          <line x1="160" y1="30" x2="280" y2="30" stroke="#ffffff" strokeWidth="1" opacity="0.08" />
          <line x1="310" y1="50" x2="380" y2="50" stroke="#ffffff" strokeWidth="1" opacity="0.12" />

          <polygon points="0,170 40,160 260,190 340,178 400,165 400,240 0,240" fill="#ffffff" opacity="0.05" stroke="none" />

          <polygon points="346,91 364,88 390,92 390,160 364,166 346,163" fill="#ffffff" opacity="0.05" stroke="none" />
          <path d="M 346,91 L 364,88 L 390,92 M 390,160 L 364,166 L 346,163 M 364,88 L 364,166" stroke="#ffffff" strokeWidth="0.8" opacity="0.25" />
          <polygon points="346,91 364,88 364,95 346,98" fill="#ffffff" opacity="0.08" stroke="none" />
          <polygon points="364,88 390,92 390,98 364,95" fill="#ffffff" opacity="0.08" stroke="none" />
          <polygon points="346,120 364,117 364,122 346,125" fill="#ffffff" opacity="0.08" stroke="none" />
          <polygon points="364,117 390,121 390,125 364,122" fill="#ffffff" opacity="0.08" stroke="none" />
          <polygon points="348,98 362,95 362,117 348,120" fill="#000000" opacity="0.2" stroke="none" />
          <polygon points="366,95 388,98 388,121 366,117" fill="#000000" opacity="0.2" stroke="none" />
          <polygon points="348,125 362,122 362,152 348,150" fill="#000000" opacity="0.2" stroke="none" />
          <polygon points="366,122 388,125 388,150 366,145" fill="#000000" opacity="0.2" stroke="none" />

          <polygon points="40,100 260,70 260,88 40,109" fill="#ffffff" opacity="0.05" stroke="none" />
          <polygon points="260,70 340,82 340,96.4 260,88" fill="#ffffff" opacity="0.05" stroke="none" />
          
          <polygon points="40,109 260,88 260,124 40,127" fill="#ffffff" opacity="0.12" stroke="none" />
          <polygon points="260,88 340,96.4 340,125.2 260,124" fill="#ffffff" opacity="0.12" stroke="none" />

          <polygon points="40,127 260,124 260,136 40,133" fill="#ffffff" opacity="0.05" stroke="none" />
          <polygon points="260,124 340,125.2 340,134.8 260,136" fill="#ffffff" opacity="0.05" stroke="none" />

          <polygon points="40,133 260,136 260,178 40,154" fill="#ffffff" opacity="0.12" stroke="none" />
          <polygon points="260,136 340,134.8 340,168.4 260,178" fill="#ffffff" opacity="0.12" stroke="none" />

          <polygon points="40,154 260,178 260,190 40,160" fill="#ffffff" opacity="0.05" stroke="none" />
          <polygon points="260,178 340,168.4 340,178 260,190" fill="#ffffff" opacity="0.05" stroke="none" />

          <polygon points="44,108.5 75,105.5 75,126.5 44,126.8" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="80,105.2 115,102 115,126 80,126.5" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="121,101.4 160,97.8 160,125.4 121,125.7" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="167,97.1 210,92.9 210,124.7 167,125.3" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="218,92.2 251,88.9 251,124 218,124.6" fill="#000000" opacity="0.3" stroke="none" />

          <polygon points="44,132.9 75,133.5 75,158 44,154.2" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="80,133.6 115,134 115,162 80,158.4" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="121,133.8 160,134.6 160,166.8 121,162.1" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="167,134.7 210,135.3 210,172.4 167,167.6" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="218,135.4 251,135.7 251,176.7 218,173.2" fill="#000000" opacity="0.3" stroke="none" />

          <polygon points="269,88.9 298,92 298,124.6 269,124" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="304,92.5 334,95.65 334,124.75 304,124.3" fill="#000000" opacity="0.3" stroke="none" />

          <polygon points="269,135.7 298,135.5 298,173.5 269,176.65" fill="#000000" opacity="0.3" stroke="none" />
          <polygon points="304,134.9 334,134.45 334,168.45 304,172" fill="#000000" opacity="0.3" stroke="none" />

          <path d="M 40,100 L 260,70 L 340,82" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 40,109 L 260,88 L 340,96.4" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <path d="M 40,127 L 260,124 L 340,125.2" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <path d="M 40,133 L 260,136 L 340,134.8" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <path d="M 40,154 L 260,178 L 340,168.4" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <path d="M 40,160 L 260,190 L 340,178" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" strokeLinejoin="round" />

          <line x1="40" y1="100" x2="40" y2="160" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
          <line x1="44" y1="108.5" x2="44" y2="126.8" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="44" y1="132.9" x2="44" y2="154.2" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="75" y1="105.5" x2="75" y2="126.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="75" y1="133.5" x2="75" y2="158" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="80" y1="105.2" x2="80" y2="126.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="80" y1="133.6" x2="80" y2="158.4" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="115" y1="102" x2="115" y2="126" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="115" y1="134" x2="115" y2="162" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="121" y1="101.4" x2="121" y2="125.7" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="121" y1="133.8" x2="121" y2="162.1" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="160" y1="97.8" x2="160" y2="125.4" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="160" y1="134.6" x2="160" y2="166.8" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="167" y1="97.1" x2="167" y2="125.3" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="167" y1="134.7" x2="167" y2="167.6" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="210" y1="92.9" x2="210" y2="124.7" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="210" y1="135.3" x2="210" y2="172.4" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="218" y1="92.2" x2="218" y2="124.6" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="218" y1="135.4" x2="218" y2="173.2" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="260" y1="70" x2="260" y2="190" stroke="#ffffff" strokeWidth="1.5" opacity="0.6" strokeLinecap="round" />
          <line x1="251" y1="88.9" x2="251" y2="124" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="251" y1="135.7" x2="251" y2="176.7" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          
          <line x1="269" y1="88.9" x2="269" y2="124" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="269" y1="135.7" x2="269" y2="176.65" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="298" y1="92" x2="298" y2="124.6" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="298" y1="135.5" x2="298" y2="173.5" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="304" y1="92.5" x2="304" y2="124.3" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="304" y1="134.9" x2="304" y2="172" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          
          <line x1="340" y1="82" x2="340" y2="178" stroke="#ffffff" strokeWidth="1.2" opacity="0.5" />
          <line x1="334" y1="95.65" x2="334" y2="124.75" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />
          <line x1="334" y1="134.45" x2="334" y2="168.45" stroke="#ffffff" strokeWidth="0.8" opacity="0.4" />

          <line x1="80" y1="195" x2="80" y2="175" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
          <circle cx="76" cy="172" r="5" fill="#ffffff" opacity="0.12" />
          <circle cx="84" cy="174" r="6" fill="#ffffff" opacity="0.10" />
          <circle cx="80" cy="168" r="6" fill="#ffffff" opacity="0.18" />

          <line x1="150" y1="205" x2="150" y2="182" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
          <circle cx="145" cy="178" r="6" fill="#ffffff" opacity="0.12" />
          <circle cx="155" cy="180" r="7" fill="#ffffff" opacity="0.10" />
          <circle cx="150" cy="172" r="8" fill="#ffffff" opacity="0.18" />

          <line x1="220" y1="212" x2="220" y2="188" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
          <circle cx="214" cy="184" r="7" fill="#ffffff" opacity="0.12" />
          <circle cx="226" cy="186" r="8" fill="#ffffff" opacity="0.10" />
          <circle cx="220" cy="178" r="9" fill="#ffffff" opacity="0.18" />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative' }}>
          <Image 
            src="/upen-logo.png" 
            alt="UPEN Logo" 
            width={230}
            height={100}
            style={{ 
              width: '230px', 
              height: 'auto', 
              marginBottom: '22px', 
              filter: 'brightness(0) invert(1)',
              opacity: 0.95
            }} 
          />
          <p className="brand-text">Control total del patrimonio institucional</p>
          <p className="brand-subtext">Universidad Politécnica del Estado de Nayarit</p>
        </div>
      </div>
    </div>
  );
}
