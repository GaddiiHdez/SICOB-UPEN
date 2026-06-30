'use client';
import Image from 'next/image';
import { Mail, Award, ShieldCheck, Heart } from 'lucide-react';

export default function ModalAbout({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={onClose} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.25s ease'
      }}
    >
      <div 
        className="about-modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          width: '90%',
          maxWidth: '460px',
          padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        {/* Glow de Fondo Premium */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '180px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(90, 115, 60, 0.25) 0%, rgba(0, 113, 106, 0.08) 50%, rgba(255,255,255,0) 70%)',
          filter: 'blur(20px)',
          pointerEvents: 'none'
        }}></div>

        {/* Botón de Cerrar */}
        <button 
          onClick={onClose} 
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'var(--bg-body)',
            border: '1px solid var(--border)',
            width: 32,
            height: 32,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            color: 'var(--text-secondary)',
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          &times;
        </button>

        {/* Logotipo Backlit */}
        <div 
          className="about-logo-wrap" 
          style={{
            width: '96px',
            height: '96px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'absolute',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(90, 115, 60, 0.35) 0%, rgba(0, 113, 106, 0.12) 60%, rgba(255, 255, 255, 0) 80%)',
            filter: 'blur(10px)',
            zIndex: 1,
            pointerEvents: 'none'
          }}></div>
          <Image 
            src="/sicob-logo.png" 
            alt="SICOB Logo" 
            width={80}
            height={80}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              position: 'relative',
              zIndex: 2,
              filter: 'drop-shadow(0 4px 12px rgba(90, 115, 60, 0.25))'
            }} 
          />
        </div>

        {/* Nombre de la app y Versión */}
        <h2 style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: 0 }}>
          SICOB
        </h2>
        <span style={{ 
          fontSize: '11px', 
          fontWeight: 700, 
          color: 'var(--accent)', 
          background: 'rgba(0, 113, 106, 0.08)', 
          padding: '3px 8px', 
          borderRadius: '20px', 
          marginTop: '6px',
          border: '1px solid rgba(0, 113, 106, 0.15)'
        }}>
          v1.0.0 (Estable)
        </span>

        {/* Breve descripción */}
        <p style={{ 
          fontSize: '13px', 
          color: 'var(--text-secondary)', 
          textAlign: 'center', 
          lineHeight: '1.5',
          margin: '16px 0 24px',
          fontWeight: 500
        }}>
          Sistema de Control y Operación de Bienes. Diseñado para centralizar y optimizar la administración patrimonial de activos fijos, inventarios tecnológicos, servicios de mantenimiento preventivo y consumibles de manera eficiente y moderna.
        </p>

        {/* Línea Divisoria */}
        <hr style={{ border: 0, borderTop: '1px solid var(--border-light)', width: '100%', margin: '0 0 20px 0' }} />

        {/* Información del Desarrollador y Universidad */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <Award size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desarrollador</div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 700 }}>Henry Gaddiel Hernandez Cortes</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Ingeniería en Software</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Universidad</div>
              <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', fontWeight: 600 }}>Universidad Politécnica del Estado de Nayarit</div>
            </div>
          </div>

        </div>

        {/* Enlaces de Contacto y GitHub */}
        <div style={{ 
          width: '100%', 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '12px', 
          marginTop: '28px' 
        }}>
          <a 
            href="mailto:gaddiel3002@gmail.com" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '12px 16px', 
              background: 'var(--bg-body)', 
              border: '1px solid var(--border)', 
              borderRadius: '12px', 
              color: 'var(--text-primary)', 
              fontSize: '13px', 
              fontWeight: 600, 
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'rgba(0, 113, 106, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-body)';
            }}
          >
            <Mail size={15} /> Correo
          </a>

          <a 
            href="https://github.com/GaddiiHdez/SICOB-UPEN" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '12px 16px', 
              background: '#24292e', 
              borderRadius: '12px', 
              color: '#FFFFFF', 
              fontSize: '13px', 
              fontWeight: 600, 
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(36, 41, 46, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(36, 41, 46, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(36, 41, 46, 0.25)';
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="15" 
              height="15" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
            </svg>
            GitHub
          </a>
        </div>

        {/* Footer del Modal */}
        <div style={{ 
          marginTop: '32px', 
          fontSize: '10.5px', 
          color: 'var(--text-muted)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          fontWeight: 600
        }}>
          Hecho con <Heart size={10} style={{ color: '#E11D48', fill: '#E11D48' }} /> para la comunidad UPEN
        </div>
      </div>
    </div>
  );
}
