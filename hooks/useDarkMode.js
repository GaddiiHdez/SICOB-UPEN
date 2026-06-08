'use client';
import { useState, useEffect } from 'react';

/**
 * useDarkMode — Hook de modo oscuro
 *
 * Gestiona la sincronización del tema oscuro con localStorage y la clase
 * CSS del body. Antes vivía como useEffect + toggleDarkMode inline en
 * page.js (líneas 177–200).
 *
 * @param {Function} showToast - Callback opcional para confirmar el cambio de tema.
 * @returns {{ darkMode: boolean, toggleDarkMode: Function }}
 */
export function useDarkMode(showToast) {
  const [darkMode, setDarkMode] = useState(false);

  // Leer preferencia guardada en el primer montaje
  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    Promise.resolve().then(() => setDarkMode(saved));
    if (saved) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkMode', String(newValue));
    if (newValue) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    if (showToast) showToast(`Modo ${newValue ? 'Oscuro' : 'Claro'} activado ✓`, 'info');
  };

  return { darkMode, toggleDarkMode };
}
