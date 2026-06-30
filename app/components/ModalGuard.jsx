"use client";
import { useEffect, useState, useRef } from "react";

/**
 * ModalGuard — Protector Global contra cierres accidentales de ventanas emergentes.
 *
 * 1. Detecta si el usuario escribe o modifica campos (input/change) dentro de un modal y marca el modal como sucio (data-dirty="true").
 * 2. Intercepta clics de cierre en la fase de captura para pedir confirmación si hay datos sin guardar mediante un diálogo personalizado premium.
 * 3. Protege la navegación nativa hacia atrás en dispositivos móviles (gesto swipe back / botón físico back) mediante historial de navegación (History API).
 */
export default function ModalGuard() {
  const [showConfirm, setShowConfirm] = useState(false);
  const pendingActionRef = useRef(null);
  const isHandlingPopStateRef = useRef(false);

  // Helper para buscar y simular clic en el botón de cerrar/cancelar del modal
  const clickCloseButton = (overlay) => {
    const buttons = overlay.querySelectorAll("button, .btn-close, .close-btn, .modal-close, [data-close]");
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || "";
      if (
        text === "cancelar" ||
        text === "cerrar" ||
        text === "✕" ||
        text === "x" ||
        btn.classList.contains("btn-close") ||
        btn.classList.contains("close-btn") ||
        btn.classList.contains("modal-close") ||
        btn.hasAttribute("data-close")
      ) {
        btn.click();
        return;
      }
    }
    // Fallback: clic directo al overlay de fondo
    overlay.click();
  };

  const handleAcceptConfirm = () => {
    setShowConfirm(false);
    if (!pendingActionRef.current) return;

    const { trigger, overlay, isPopState, topOverlay } = pendingActionRef.current;

    if (isPopState) {
      isHandlingPopStateRef.current = true;
      topOverlay.setAttribute("data-dirty", "false");
      
      const closeBtn = topOverlay.querySelector("button, .btn-close, .close-btn, .modal-close, [data-close]") || topOverlay;
      closeBtn.click();
      
      window.history.back();
      
      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 100);
    } else {
      overlay.setAttribute("data-dirty", "false");
      trigger.click();
    }

    pendingActionRef.current = null;
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
    
    if (pendingActionRef.current?.isPopState) {
      // Re-insertar estado de modal en la historia para deshacer la navegación atrás
      window.history.pushState({ modalOpen: true }, "");
    }
    
    pendingActionRef.current = null;
  };

  useEffect(() => {
    // 1. Detectar cambios en campos del formulario dentro del modal
    const handleInput = (event) => {
      const target = event.target;
      if (!target) return;

      const tagName = target.tagName;
      if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
        const overlay = target.closest(".modal-overlay");
        if (overlay) {
          overlay.setAttribute("data-dirty", "true");
        }
      }
    };

    // 2. Interceptar clics en botones de cierre o en el fondo (capturing phase)
    const handleCaptureClick = (event) => {
      const target = event.target;
      if (!target) return;

      let isCloseAction = false;
      let overlay = null;

      // Caso A: Clic en el fondo del overlay
      if (target.classList.contains("modal-overlay")) {
        isCloseAction = true;
        overlay = target;
      } else {
        // Caso B: Clic en botones de cerrar o cancelar
        const closeTrigger = target.closest("button, .btn-close, .close-btn, .modal-close, [data-close]");
        if (closeTrigger) {
          const text = closeTrigger.textContent?.trim().toLowerCase() || "";
          if (
            text === "cancelar" ||
            text === "cerrar" ||
            text === "✕" ||
            text === "x" ||
            closeTrigger.classList.contains("btn-close") ||
            closeTrigger.classList.contains("close-btn") ||
            closeTrigger.classList.contains("modal-close") ||
            closeTrigger.hasAttribute("data-close")
          ) {
            isCloseAction = true;
            overlay = target.closest(".modal-overlay");
          }
        }
      }

      // Confirmar cierre si el formulario tiene cambios
      if (isCloseAction && overlay) {
        const isDirty = overlay.getAttribute("data-dirty") === "true";
        if (isDirty) {
          event.preventDefault();
          event.stopPropagation();

          pendingActionRef.current = {
            trigger: target.closest("button, .btn-close, .close-btn, .modal-close, [data-close]") || overlay,
            overlay,
            isPopState: false
          };
          setShowConfirm(true);
        }
      }
    };

    // 3. Interceptar el botón / gesto de atrás en móviles
    const handlePopState = (event) => {
      const overlays = document.querySelectorAll(".modal-overlay");
      if (overlays.length > 0) {
        const topOverlay = overlays[overlays.length - 1];
        const isDirty = topOverlay.getAttribute("data-dirty") === "true";

        if (isDirty) {
          pendingActionRef.current = {
            isPopState: true,
            topOverlay
          };
          setShowConfirm(true);
        } else {
          isHandlingPopStateRef.current = true;
          clickCloseButton(topOverlay);
          setTimeout(() => {
            isHandlingPopStateRef.current = false;
          }, 100);
        }
      }
    };

    // 4. MutationObserver para sincronizar el historial
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) {
            const isOverlay = node.classList.contains("modal-overlay") || node.querySelector(".modal-overlay");
            if (isOverlay) {
              window.history.pushState({ modalOpen: true }, "");
            }
          }
        }
        for (const node of mutation.removedNodes) {
          if (node.nodeType === 1) {
            const isOverlay = node.classList.contains("modal-overlay") || node.querySelector(".modal-overlay");
            if (isOverlay) {
              setTimeout(() => {
                const remainingModals = document.querySelectorAll(".modal-overlay").length;
                if (remainingModals === 0 && window.history.state?.modalOpen && !isHandlingPopStateRef.current) {
                  window.history.back();
                }
              }, 50);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("input", handleInput, true);
    document.addEventListener("change", handleInput, true);
    document.addEventListener("click", handleCaptureClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleInput, true);
      document.removeEventListener("click", handleCaptureClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  return (
    <>
      {showConfirm && (
        <div className="custom-confirm-overlay">
          <div className="custom-confirm-box">
            <div className="confirm-icon-wrap">
              ⚠️
            </div>
            <h3>Cambios sin guardar</h3>
            <p>
              Tienes información redactada o cambios sin guardar en este formulario. ¿Estás seguro de que deseas salir? Perderás todos los datos ingresados.
            </p>
            <div className="confirm-buttons-wrap">
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={handleCancelConfirm}
              >
                Permanecer
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-destructive" 
                onClick={handleAcceptConfirm}
              >
                Descartar cambios
              </button>
            </div>
          </div>
          
          <style jsx>{`
            .custom-confirm-overlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(0, 0, 0, 0.4);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 999999;
              animation: confirmFadeIn 0.2s ease-out;
            }
            .custom-confirm-box {
              background: var(--bg-card);
              border: 1px solid var(--border);
              border-radius: var(--radius-lg);
              box-shadow: var(--shadow-lg);
              max-width: 420px;
              width: 90%;
              padding: 28px;
              text-align: center;
              animation: confirmScaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .confirm-icon-wrap {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              background: rgba(245, 158, 11, 0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              color: #F59E0B;
              font-size: 24px;
            }
            .custom-confirm-box h3 {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 10px;
              color: var(--text-primary);
            }
            .custom-confirm-box p {
              font-size: 13.5px;
              color: var(--text-secondary);
              line-height: 1.5;
              margin: 0 0 24px;
            }
            .confirm-buttons-wrap {
              display: flex;
              gap: 12px;
              justify-content: center;
            }
            .confirm-buttons-wrap :global(.btn) {
              flex: 1;
              font-size: 13px;
              font-weight: 700;
              padding: 10px 16px;
              height: auto;
            }
            .confirm-buttons-wrap :global(.btn-destructive) {
              background: #EF4444 !important;
              border-color: #EF4444 !important;
              color: #FFFFFF !important;
            }
            .confirm-buttons-wrap :global(.btn-destructive:hover) {
              background: #DC2626 !important;
              border-color: #DC2626 !important;
            }
            @keyframes confirmFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes confirmScaleIn {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
