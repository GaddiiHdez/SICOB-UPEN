"use client";
import { useEffect } from "react";

/**
 * ModalGuard — Protector Global contra cierres accidentales de ventanas emergentes.
 *
 * 1. Detecta si el usuario escribe o modifica campos (input/change) dentro de un modal y marca el modal como sucio (data-dirty="true").
 * 2. Intercepta clics de cierre en la fase de captura para pedir confirmación si hay datos sin guardar.
 * 3. Protege la navegación nativa hacia atrás en dispositivos móviles (gesto swipe back / botón físico back) mediante historial de navegación (History API).
 */
export default function ModalGuard() {
  useEffect(() => {
    let isHandlingPopState = false;

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
          const confirmed = window.confirm(
            "⚠️ Tienes información redactada o cambios sin guardar en este formulario.\n\n¿Estás seguro de que deseas salir? Perderás todos los datos ingresados."
          );
          if (!confirmed) {
            event.preventDefault();
            event.stopPropagation();
          }
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
          const confirmed = window.confirm(
            "⚠️ Tienes información redactada o cambios sin guardar en este formulario.\n\n¿Estás seguro de que deseas salir? Perderás todos los datos ingresados."
          );
          if (confirmed) {
            isHandlingPopState = true;
            clickCloseButton(topOverlay);
            setTimeout(() => {
              isHandlingPopState = false;
            }, 100);
          } else {
            // Re-insertar estado de modal en la historia para deshacer la navegación atrás
            window.history.pushState({ modalOpen: true }, "");
          }
        } else {
          isHandlingPopState = true;
          clickCloseButton(topOverlay);
          setTimeout(() => {
            isHandlingPopState = false;
          }, 100);
        }
      }
    };

    // 4. MutationObserver para sincronizar el historial cuando los modales se abren/cierran por otros medios
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
              if (window.history.state?.modalOpen && !isHandlingPopState) {
                window.history.back();
              }
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

  return null;
}
