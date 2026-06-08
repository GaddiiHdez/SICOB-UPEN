'use client';

/**
 * TabBar — Barra de pestañas compartida
 *
 * Reemplaza el patrón copy-paste de botones de pestaña usado en
 * ConfiguracionPanel.jsx y MantenimientosPanel.jsx.
 *
 * @param {Array<{ id: string, label: string, count?: number }>} tabs
 * @param {string} activeTab - ID de la pestaña activa
 * @param {Function} onChange - Callback al cambiar de pestaña
 * @param {'underline'|'segment'} variant - Estilo visual de la barra
 */
export default function TabBar({ tabs, activeTab, onChange, variant = 'underline' }) {
  if (variant === 'segment') {
    // Estilo tipo "segmented control" (ConfiguracionPanel)
    return (
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border)',
        gap: 6,
        paddingBottom: 0,
        marginTop: 4
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              border: '1px solid transparent',
              background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
              borderColor: activeTab === tab.id
                ? 'var(--border) var(--border) transparent'
                : 'transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
              marginBottom: -2,
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              height: 44,
              transition: 'all 0.2s ease',
              outline: 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // Estilo "underline" (MantenimientosPanel)
  return (
    <div style={{
      display: 'flex',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-body)',
      padding: '12px 24px 0',
      gap: 16
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '12px 16px',
            border: 'none',
            borderBottom: activeTab === tab.id
              ? '3px solid var(--primary)'
              : '3px solid transparent',
            background: 'transparent',
            color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === tab.id ? '600' : '400',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              fontSize: 10,
              background: activeTab === tab.id
                ? 'rgba(13, 148, 136, 0.1)'
                : 'var(--border)',
              padding: '2px 6px',
              borderRadius: 10
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
