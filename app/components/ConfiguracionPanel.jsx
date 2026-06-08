'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import TabBar from '@/app/components/shared/TabBar';
import TabFormato from '@/app/components/config/TabFormato';
import TabIdentidad from '@/app/components/config/TabIdentidad';
import TabSistema from '@/app/components/config/TabSistema';
import {
  getCorrelativoPadding,
  updateCorrelativoPadding
} from '@/lib/configHelpers';

/**
 * ConfiguracionPanel — Orquestador del Panel de Configuración
 *
 * Mantiene todo el estado compartido entre las 3 pestañas y delega
 * el JSX a sub-componentes especializados:
 *   - TabFormato   → Formato de códigos y etiquetas
 *   - TabIdentidad → Identidad institucional (nombre, logo)
 *   - TabSistema   → Backups, usuarios y estatus del servidor
 *
 * Pasó de 1105 líneas a ~170 líneas.
 */
export default function ConfiguracionPanel({ bienes, showToast, configuracion = {}, refreshConfig }) {

  // ── Navegación ────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('codigos');

  // ── Estado compartido: Formato de Códigos ─────────────────
  const [format, setFormat]           = useState('UPEN-{CAT}-{YEAR}-{CORRELATIVO}');
  const [cabecera, setCabecera]       = useState('');
  const [previewCategory, setPreviewCategory] = useState('COMP');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [etiquetaMostrarCabecera, setEtiquetaMostrarCabecera] = useState(true);
  const [etiquetaMostrarMarcaModelo, setEtiquetaMostrarMarcaModelo] = useState(true);
  const [etiquetaMostrarSerial, setEtiquetaMostrarSerial] = useState(true);
  const [etiquetaAnchoMm, setEtiquetaAnchoMm] = useState(30);
  const [etiquetaAltoMm, setEtiquetaAltoMm] = useState(15);
  const [etiquetaAlturaCodigoBarrasMm, setEtiquetaAlturaCodigoBarrasMm] = useState(5.6);
  const [etiquetaLetraCabeceraPt, setEtiquetaLetraCabeceraPt] = useState(4.5);
  const [etiquetaLetraMarcaModeloPt, setEtiquetaLetraMarcaModeloPt] = useState(4.2);
  const [etiquetaLetraCodigoPt, setEtiquetaLetraCodigoPt] = useState(5.5);
  const [etiquetaLetraSerialPt, setEtiquetaLetraSerialPt] = useState(5.0);

  // ── Estado compartido: Identidad Institucional ─────────────
  const [univName, setUnivName]       = useState('Universidad Politécnica del Estado');
  const [univAcronym, setUnivAcronym] = useState('UPEN');
  const [logoBase64, setLogoBase64]   = useState('');
  const [savingIdentity, setSavingIdentity] = useState(false);

  // ── Estado compartido: Respaldos ──────────────────────────
  const [backupsList, setBackupsList]           = useState([]);
  const [loadingBackups, setLoadingBackups]     = useState(false);
  const [restoring, setRestoring]               = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState(null);
  const [importedBackupData, setImportedBackupData] = useState(null);
  const fileInputRef = useRef(null);

  // ── Categorías únicas de los bienes ───────────────────────
  const categoriesList = useMemo(() => {
    if (!bienes) return ['COMP', 'LAPT', 'DRON', 'NETW'];
    const list = Array.from(new Set(bienes.map(b => b.tipo).filter(Boolean)));
    return list.length > 0 ? list : ['COMP', 'LAPT', 'DRON', 'NETW'];
  }, [bienes]);

  // Sincronizar abreviatura de categoría por defecto
  useEffect(() => {
    if (categoriesList.length > 0) {
      const abbr = categoriesList[0].toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
      Promise.resolve().then(() => setPreviewCategory(abbr || 'COMP'));
    }
  }, [categoriesList]);

  // Hidratar estado desde props de configuración global
  useEffect(() => {
    Promise.resolve().then(() => {
      if (configuracion?.formato_codigo_inventario)   setFormat(configuracion.formato_codigo_inventario);
      if (configuracion?.nombre_institucion)          setUnivName(configuracion.nombre_institucion);
      if (configuracion?.siglas_institucion)          setUnivAcronym(configuracion.siglas_institucion);
      if (configuracion?.logo_institucion)            setLogoBase64(configuracion.logo_institucion);
      if (configuracion?.cabecera_etiqueta_impresion) setCabecera(configuracion.cabecera_etiqueta_impresion);
      setEtiquetaMostrarCabecera(configuracion?.etiqueta_mostrar_cabecera !== 'false');
      setEtiquetaMostrarMarcaModelo(configuracion?.etiqueta_mostrar_marca_modelo !== 'false');
      setEtiquetaMostrarSerial(configuracion?.etiqueta_mostrar_serial !== 'false');
      setEtiquetaAnchoMm(parseFloat(configuracion?.etiqueta_ancho_mm || '30'));
      setEtiquetaAltoMm(parseFloat(configuracion?.etiqueta_alto_mm || '15'));
      setEtiquetaAlturaCodigoBarrasMm(parseFloat(configuracion?.etiqueta_altura_codigo_barras_mm || '5.6'));
      setEtiquetaLetraCabeceraPt(parseFloat(configuracion?.etiqueta_letra_cabecera_pt || '4.5'));
      setEtiquetaLetraMarcaModeloPt(parseFloat(configuracion?.etiqueta_letra_marca_modelo_pt || '4.2'));
      setEtiquetaLetraCodigoPt(parseFloat(configuracion?.etiqueta_letra_codigo_pt || '5.5'));
      setEtiquetaLetraSerialPt(parseFloat(configuracion?.etiqueta_letra_serial_pt || '5.0'));
      setLoading(false);
    });
  }, [configuracion]);

  // Cargar lista de respaldos al entrar a la pestaña "sistema"
  const fetchBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch('/api/configuracion/backup');
      if (res.ok) {
        const data = await res.json();
        setBackupsList(data.backups || []);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (activeTab === 'sistema') {
      Promise.resolve().then(() => { if (active) fetchBackups(); });
    }
    return () => { active = false; };
  }, [activeTab, fetchBackups]);

  // ── Handlers: Tab Formato ─────────────────────────────────
  const handleSaveFormat = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          formato_codigo_inventario: format, 
          cabecera_etiqueta_impresion: cabecera.trim(),
          etiqueta_mostrar_cabecera: String(etiquetaMostrarCabecera),
          etiqueta_mostrar_marca_modelo: String(etiquetaMostrarMarcaModelo),
          etiqueta_mostrar_serial: String(etiquetaMostrarSerial),
          etiqueta_ancho_mm: String(etiquetaAnchoMm),
          etiqueta_alto_mm: String(etiquetaAltoMm),
          etiqueta_altura_codigo_barras_mm: String(etiquetaAlturaCodigoBarrasMm),
          etiqueta_letra_cabecera_pt: String(etiquetaLetraCabeceraPt),
          etiqueta_letra_marca_modelo_pt: String(etiquetaLetraMarcaModeloPt),
          etiqueta_letra_codigo_pt: String(etiquetaLetraCodigoPt),
          etiqueta_letra_serial_pt: String(etiquetaLetraSerialPt)
        })
      });
      if (!res.ok) throw new Error('Error al guardar');
      if (showToast) showToast('¡Configuración de etiqueta guardada exitosamente!', 'success');
      if (refreshConfig) await refreshConfig();
    } catch (err) {
      alert(err.message || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const appendTag = (tag) => {
    setFormat(prev => {
      const trimmed = prev.trim();
      return trimmed.endsWith('-') || trimmed === '' ? prev + tag : prev + '-' + tag;
    });
  };

  // ── Handlers: Tab Identidad ───────────────────────────────
  const handleSaveIdentity = async (e) => {
    e.preventDefault();
    setSavingIdentity(true);
    try {
      const res = await fetch('/api/configuracion', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre_institucion: univName.trim(), siglas_institucion: univAcronym.trim(), logo_institucion: logoBase64 })
      });
      if (!res.ok) throw new Error('Error al guardar');
      if (showToast) showToast('¡Identidad institucional guardada exitosamente!', 'success');
      if (refreshConfig) await refreshConfig();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error al guardar la identidad');
    } finally {
      setSavingIdentity(false);
    }
  };

  // ── Handlers: Tab Sistema ─────────────────────────────────
  const handleCreateBackup = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/configuracion/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Error al generar copia de seguridad');
      const data = await res.json();
      if (showToast) showToast(`¡Respaldo '${data.filename}' creado con éxito en el servidor!`, 'success');
      fetchBackups();
    } catch (err) {
      alert(err.message || 'Error al generar el respaldo');
    } finally {
      setSaving(false);
    }
  };

  const handleExportDatabase = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/configuracion/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Error al generar respaldo para exportación');
      const data = await res.json();
      const a = document.createElement('a');
      a.href = `/api/configuracion/backup?filename=${data.filename}`;
      a.download = data.filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      if (showToast) showToast('¡Base de datos exportada y descargada exitosamente!', 'success');
      fetchBackups();
    } catch (err) {
      alert(err.message || 'Error al exportar base de datos');
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data || typeof parsed.data !== 'object') throw new Error('El archivo no contiene un formato de respaldo estructurado de GDI.');
        setImportedBackupData(parsed);
        setSelectedBackupFile(null);
        setShowRestoreModal(true);
      } catch (err) {
        alert('Error al leer el archivo de respaldo: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    setRestoring(true);
    setShowRestoreModal(false);
    try {
      const body = selectedBackupFile ? { filename: selectedBackupFile } : importedBackupData ? { backupData: importedBackupData } : null;
      if (!body) return;
      const res = await fetch('/api/configuracion/backup/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al restaurar'); }
      if (showToast) showToast('¡Base de datos restaurada y secuencias sincronizadas con éxito!', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      alert(err.message || 'Error al restaurar base de datos');
      setRestoring(false);
    } finally {
      setSelectedBackupFile(null);
      setImportedBackupData(null);
    }
  };

  const handleDownloadBackup = (filename) => {
    const a = document.createElement('a');
    a.href = `/api/configuracion/backup?filename=${filename}`;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleDeleteBackup = async (filename) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el respaldo '${filename}' del servidor?`)) return;
    try {
      const res = await fetch(`/api/configuracion/backup?filename=${filename}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el archivo de respaldo');
      if (showToast) showToast('Respaldo eliminado del servidor.', 'success');
      fetchBackups();
    } catch (err) {
      alert(err.message || 'Error al eliminar respaldo');
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* Cabecera */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="content-panel-label">Parámetros Globales</div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>v0.9.9 (Pre-lanzamiento)</span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 4 }}>Configuración General del Sistema</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
          Administra las reglas de control de activos, la plantilla institucional y respaldos del sistema.
        </p>
      </div>

      {/* Barra de pestañas */}
      <TabBar
        variant="segment"
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'codigos',   label: '🏷️ Formato de Códigos' },
          { id: 'identidad', label: '🏫 Identidad Institucional' },
          { id: 'sistema',   label: '🔐 Accesos y Respaldos' }
        ]}
      />

      {/* Contenido de las pestañas */}
      <div className="fade-in" style={{ width: '100%' }}>
        {activeTab === 'codigos' && (
          <TabFormato
            format={format} setFormat={setFormat}
            cabecera={cabecera} setCabecera={setCabecera}
            previewCategory={previewCategory} setPreviewCategory={setPreviewCategory}
            categoriesList={categoriesList}
            loading={loading} saving={saving}
            univAcronym={univAcronym}
            onSave={handleSaveFormat}
            appendTag={appendTag}
            etiquetaMostrarCabecera={etiquetaMostrarCabecera}
            setEtiquetaMostrarCabecera={setEtiquetaMostrarCabecera}
            etiquetaMostrarMarcaModelo={etiquetaMostrarMarcaModelo}
            setEtiquetaMostrarMarcaModelo={setEtiquetaMostrarMarcaModelo}
            etiquetaMostrarSerial={etiquetaMostrarSerial}
            setEtiquetaMostrarSerial={setEtiquetaMostrarSerial}
            etiquetaAnchoMm={etiquetaAnchoMm}
            setEtiquetaAnchoMm={setEtiquetaAnchoMm}
            etiquetaAltoMm={etiquetaAltoMm}
            setEtiquetaAltoMm={setEtiquetaAltoMm}
            etiquetaAlturaCodigoBarrasMm={etiquetaAlturaCodigoBarrasMm}
            setEtiquetaAlturaCodigoBarrasMm={setEtiquetaAlturaCodigoBarrasMm}
            etiquetaLetraCabeceraPt={etiquetaLetraCabeceraPt}
            setEtiquetaLetraCabeceraPt={setEtiquetaLetraCabeceraPt}
            etiquetaLetraMarcaModeloPt={etiquetaLetraMarcaModeloPt}
            setEtiquetaLetraMarcaModeloPt={setEtiquetaLetraMarcaModeloPt}
            etiquetaLetraCodigoPt={etiquetaLetraCodigoPt}
            setEtiquetaLetraCodigoPt={setEtiquetaLetraCodigoPt}
            etiquetaLetraSerialPt={etiquetaLetraSerialPt}
            setEtiquetaLetraSerialPt={setEtiquetaLetraSerialPt}
          />
        )}
        {activeTab === 'identidad' && (
          <TabIdentidad
            univName={univName} setUnivName={setUnivName}
            univAcronym={univAcronym} setUnivAcronym={setUnivAcronym}
            logoBase64={logoBase64} setLogoBase64={setLogoBase64}
            saving={savingIdentity}
            onSave={handleSaveIdentity}
          />
        )}
        {activeTab === 'sistema' && (
          <TabSistema
            backupsList={backupsList} loadingBackups={loadingBackups}
            saving={saving} bienesCount={bienes?.length || 0}
            onCreateBackup={handleCreateBackup}
            onExportDatabase={handleExportDatabase}
            onImportFileClick={() => fileInputRef.current?.click()}
            onImportFile={handleImportFile}
            onTriggerRestore={(filename) => { setSelectedBackupFile(filename); setImportedBackupData(null); setShowRestoreModal(true); }}
            onDownloadBackup={handleDownloadBackup}
            onDeleteBackup={handleDeleteBackup}
            fileInputRef={fileInputRef}
          />
        )}
      </div>

      {/* Modal de Advertencia de Restauración */}
      {showRestoreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, padding: '28px', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 36, textAlign: 'center' }}>⚠️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center', letterSpacing: '-0.02em' }}>¡Advertencia de Restauración!</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, textAlign: 'center' }}>
              Estás a punto de sobrescribir toda la base de datos actual. Todos los activos, asignaciones, categorías, ubicaciones y operadores creados después de este respaldo serán <strong style={{ color: '#EF4444' }}>permanentemente eliminados</strong>.
            </p>
            {selectedBackupFile && (
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                <strong>Archivo local seleccionado:</strong> {selectedBackupFile}
              </div>
            )}
            {importedBackupData && (
              <div style={{ background: 'var(--bg-body)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 12 }}>
                <strong>Respaldo Importado por Archivo:</strong>
                <ul style={{ listStyleType: 'disc', paddingLeft: 18, marginTop: 4, color: 'var(--text-secondary)' }}>
                  <li>Fecha de creación: {new Date(importedBackupData.metadata?.timestamp).toLocaleString()}</li>
                  <li>Total de registros: {importedBackupData.metadata?.totalRecords}</li>
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button type="button" onClick={() => { setShowRestoreModal(false); setSelectedBackupFile(null); setImportedBackupData(null); }}
                className="btn btn-ghost" style={{ flex: 1, border: '1px solid var(--border)' }}>Cancelar</button>
              <button type="button" onClick={handleConfirmRestore}
                className="btn btn-primary" style={{ flex: 1, backgroundColor: '#EF4444', borderColor: '#EF4444', color: '#FFFFFF' }}>Sí, Revertir Ahora</button>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla bloqueante de restauración */}
      {restoring && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(17, 24, 39, 0.96)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin-loader { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
          <div style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #0d9488', borderRadius: '50%', animation: 'spin-loader 1s linear infinite', marginBottom: 24 }} />
          <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 8, color: '#FFFFFF' }}>Restaurando Base de Datos...</h3>
          <p style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', maxWidth: 350, lineHeight: 1.5 }}>
            Por favor, no cierres esta pestaña ni recargues el navegador. Estamos reconstruyendo las relaciones y reiniciando las secuencias de PostgreSQL.
          </p>
        </div>
      )}

    </div>
  );
}
