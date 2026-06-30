'use client';
import { useRef, useEffect, useState } from 'react';

/**
 * SignaturePad — Lienzo interactivo de firma digital mediante HTML5 Canvas.
 * Soporta eventos táctiles (móviles/tabletas) y de mouse (PCs).
 *
 * @param {Function} onSave - Callback que retorna la firma en Base64 PNG.
 * @param {Function} onClear - Callback al limpiar el lienzo.
 */
export default function SignaturePad({ onSave, onClear }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawings, setHasDrawings] = useState(false);

  // Ajustar dimensiones del canvas dinámicamente según el tamaño del contenedor
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Guardar el contenido actual si ya se había dibujado para no perderlo en redimensiones
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0);

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 200; // altura fija para el área de firma

    // Restaurar trazos y configurar estilos por defecto
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1D4ED8'; // color de pluma azul institucional
    ctx.drawImage(tempCanvas, 0, 0);
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Obtener las coordenadas del cursor dentro del canvas
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();

    // Eventos táctiles
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }

    // Eventos de ratón
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Comenzar a dibujar
  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  // Dibujar trazo continuo
  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawings(true);

    // Enviar el base64 acumulado al padre en tiempo real
    if (onSave) {
      onSave(canvas.toDataURL('image/png'));
    }
  };

  // Finalizar trazo
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Limpiar el lienzo completo
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawings(false);

    if (onClear) {
      onClear();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div 
        ref={containerRef}
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          background: 'var(--bg-body)',
          position: 'relative',
          cursor: 'crosshair',
          overflow: 'hidden',
          touchAction: 'none' // Previene el scroll de página en móviles al firmar
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ display: 'block', width: '100%' }}
        />
        
        {!hasDrawings && (
          <div 
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'var(--text-muted)',
              fontSize: '12px',
              pointerEvents: 'none',
              fontWeight: 500,
              textAlign: 'center',
              userSelect: 'none',
              opacity: 0.65
            }}
          >
            ✍️ Firmar aquí (Táctil o Mouse)
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          type="button"
          onClick={clearCanvas}
          className="btn btn-ghost"
          style={{
            padding: '6px 12px',
            fontSize: '11px',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          disabled={!hasDrawings}
        >
          🧹 Limpiar firma
        </button>
      </div>
    </div>
  );
}
