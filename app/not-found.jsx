'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * not-found.jsx — Página 404 personalizada premium para SICOB-UPEN.
 * Usa el sistema de diseño del proyecto (tokens CSS de globals.css).
 * Next.js App Router carga automáticamente este archivo cuando una
 * ruta no existe (equivale a pages/404.js en el Pages Router).
 */
export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f2027 100%)',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      overflow: 'hidden',
      position: 'relative',
      padding: '2rem',
    }}>

      {/* Partículas de fondo decorativas */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none'
      }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            borderRadius: '50%',
            background: 'rgba(0, 113, 106, 0.08)',
            width: `${60 + i * 40}px`,
            height: `${60 + i * 40}px`,
            top: `${10 + i * 11}%`,
            left: `${5 + i * 12}%`,
            animation: `float-orb ${4 + i * 0.8}s ease-in-out infinite alternate`,
          }} />
        ))}
      </div>

      {/* Contenedor principal */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        maxWidth: 520,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}>

        {/* Número 404 grande */}
        <div style={{
          fontSize: 'clamp(80px, 20vw, 140px)',
          fontWeight: 900,
          lineHeight: 1,
          marginBottom: '0.25rem',
          background: 'linear-gradient(135deg, #00b4a8 0%, #00716a 40%, #004d48 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.04em',
          filter: 'drop-shadow(0 0 30px rgba(0, 180, 168, 0.3))',
        }}>
          404
        </div>

        {/* Icono institucional */}
        <div style={{
          fontSize: 42,
          marginBottom: '1rem',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
        }}>
          🏛️
        </div>

        {/* Título */}
        <h1 style={{
          fontSize: 'clamp(18px, 4vw, 26px)',
          fontWeight: 700,
          color: '#f1f5f9',
          margin: '0 0 0.75rem',
          letterSpacing: '-0.02em',
        }}>
          Página no encontrada
        </h1>

        {/* Subtítulo */}
        <p style={{
          fontSize: '0.95rem',
          color: '#94a3b8',
          lineHeight: 1.6,
          margin: '0 0 2.5rem',
          maxWidth: 380,
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          La ruta que intentas acceder no existe en{' '}
          <strong style={{ color: '#00b4a8' }}>SICOB-UPEN</strong>.
          Puede que haya sido movida, eliminada, o que el enlace sea incorrecto.
        </p>

        {/* Tarjeta de acceso rápido */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <p style={{
            fontSize: '0.8rem',
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontWeight: 600,
            marginBottom: '1rem',
            margin: '0 0 1rem',
          }}>
            Accesos directos
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { label: '🏠 Inicio', href: '/' },
              { label: '📦 Inventario', href: '/?nav=inventario' },
              { label: '🔧 Mantenimiento', href: '/?nav=mantenimientos' },
              { label: '📊 Reportes', href: '/?nav=reportes' },
            ].map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 113, 106, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(0, 180, 168, 0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = '#cbd5e1';
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Botón principal */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 32px',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #00716a 0%, #004d48 100%)',
            border: 'none',
            borderRadius: 12,
            textDecoration: 'none',
            boxShadow: '0 4px 20px rgba(0, 113, 106, 0.35)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 113, 106, 0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 113, 106, 0.35)';
          }}
        >
          ← Volver al Sistema
        </Link>

        {/* Footer */}
        <p style={{
          marginTop: '2.5rem',
          fontSize: '0.75rem',
          color: '#334155',
          letterSpacing: '0.05em',
        }}>
          SICOB — Sistema de Control y Operación de Bienes · UPEN
        </p>
      </div>

      <style>{`
        @keyframes float-orb {
          from { transform: translateY(0px) scale(1); opacity: 0.5; }
          to   { transform: translateY(-20px) scale(1.05); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
