'use client';
import { useState, useEffect } from 'react';
import UbicacionSelector from './UbicacionSelector';
import ScannerPanel from './ScannerPanel';
import ReporteDiscrepancias from './ReporteDiscrepancias';

/**
 * AuditoriaPanel — Panel principal del módulo de Auditoría Rápida de Inventario.
 * Coordina las fases del proceso: Selección, Escaneo y Reporte.
 */
export default function AuditoriaPanel({ 
  bienes = [], 
  ubicaciones = [], 
  showToast, 
  refreshBienes,
  configuracion = {}
}) {
  const [step, setStep] = useState('select'); // 'select' | 'audit' | 'report'
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState(null);
  const [scannedCodes, setScannedCodes] = useState([]);
  const [pendingResume, setPendingResume] = useState(null);

  // Cargar estado de auditoría guardado al montar el componente
  useEffect(() => {
    try {
      const saved = localStorage.getItem('active_audit');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.ubicacionSeleccionada && parsed.scannedCodes && parsed.scannedCodes.length > 0) {
          setPendingResume(parsed);
        }
      }
    } catch (e) {
      console.error("Error al cargar auditoría guardada:", e);
    }
  }, []);

  // Guardar estado de auditoría automáticamente ante cambios
  useEffect(() => {
    try {
      if (step === 'audit' || step === 'report') {
        localStorage.setItem('active_audit', JSON.stringify({
          step,
          ubicacionSeleccionada,
          scannedCodes
        }));
      } else {
        localStorage.removeItem('active_audit');
      }
    } catch (e) {
      console.error("Error al guardar auditoría:", e);
    }
  }, [step, ubicacionSeleccionada, scannedCodes]);

  const handleSelectUbicacion = (ubicacion) => {
    setUbicacionSeleccionada(ubicacion);
    setScannedCodes([]);
    setStep('audit');
    showToast(`📍 Espacio "${ubicacion.nombre}" seleccionado para auditoría`, 'info');
  };

  const handleScanCode = (code) => {
    setScannedCodes(prev => {
      if (prev.includes(code)) return prev;
      return [...prev, code];
    });
  };

  const handleRemoveCode = (code) => {
    setScannedCodes(prev => prev.filter(c => c !== code));
  };

  const handleCancelAudit = () => {
    if (confirm('¿Estás seguro de que deseas cancelar la auditoría actual? Se perderán los códigos escaneados.')) {
      setStep('select');
      setUbicacionSeleccionada(null);
      setScannedCodes([]);
    }
  };

  return (
    <div className="content-panel fade-in" style={{ padding: '24px', minHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
      
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }} className="no-print">
        <div>
          <span className="content-panel-label">Módulo Operativo</span>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: '4px 0 0', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Auditoría de Inventario Rápida
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
            Mapeo, conciliación y corrección de ubicaciones de activos tecnológicos.
          </p>
        </div>

        {/* Indicador de Pasos (Stepper) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step === 'select' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
              color: step === 'select' ? '#FFF' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800
            }}>1</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: step === 'select' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Selección
            </span>
          </div>
          <span style={{ color: 'var(--border)' }}>➔</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step === 'audit' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
              color: step === 'audit' ? '#FFF' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800
            }}>2</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: step === 'audit' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Escaneo
            </span>
          </div>
          <span style={{ color: 'var(--border)' }}>➔</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: step === 'report' ? 'var(--primary)' : 'rgba(99, 102, 241, 0.1)',
              color: step === 'report' ? '#FFF' : 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 800
            }}>3</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: step === 'report' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              Reporte
            </span>
          </div>
        </div>
      </div>

      {/* Renderizado de Pasos */}
      {step === 'select' && pendingResume && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'fade-in 0.25s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⏳</span>
            <div>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Auditoría sin finalizar detectada
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                Tienes un escaneo en progreso en <strong>{pendingResume.ubicacionSeleccionada?.nombre}</strong> con <strong>{pendingResume.scannedCodes?.length}</strong> equipos registrados.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button 
              className="btn btn-ghost"
              type="button"
              onClick={() => {
                localStorage.removeItem('active_audit');
                setPendingResume(null);
                showToast('Auditoría descartada', 'info');
              }}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              Descartar
            </button>
            <button 
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setUbicacionSeleccionada(pendingResume.ubicacionSeleccionada);
                setScannedCodes(pendingResume.scannedCodes);
                setStep(pendingResume.step || 'audit');
                setPendingResume(null);
                showToast(`Auditoría en "${pendingResume.ubicacionSeleccionada.nombre}" reanudada ✓`, 'success');
              }}
              style={{ fontSize: 12, padding: '6px 14px', background: 'var(--warning)', borderColor: 'var(--warning)', color: '#0F172A', fontWeight: 700 }}
            >
              Reanudar Escaneo
            </button>
          </div>
        </div>
      )}

      {step === 'select' && (
        <UbicacionSelector
          ubicaciones={ubicaciones}
          bienes={bienes}
          onSelect={handleSelectUbicacion}
        />
      )}

      {step === 'audit' && (
        <ScannerPanel
          ubicacion={ubicacionSeleccionada}
          bienes={bienes}
          scannedCodes={scannedCodes}
          onScanCode={handleScanCode}
          onRemoveCode={handleRemoveCode}
          onFinish={() => setStep('report')}
          onCancel={handleCancelAudit}
        />
      )}

      {step === 'report' && (
        <ReporteDiscrepancias
          ubicacion={ubicacionSeleccionada}
          bienes={bienes}
          scannedCodes={scannedCodes}
          onFixLocation={() => {
            refreshBienes();
          }}
          onFixAll={() => {
            refreshBienes();
          }}
          onReset={() => {
            setStep('select');
            setUbicacionSeleccionada(null);
            setScannedCodes([]);
          }}
          showToast={showToast}
          configuracion={configuracion}
        />
      )}
    </div>
  );
}
