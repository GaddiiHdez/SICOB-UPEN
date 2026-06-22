import React from 'react';
import {
  LayoutDashboard,
  Archive,
  FlaskConical,
  Armchair,
  Package,
  ScanSearch,
  Users,
  FolderOpen,
  ClipboardList,
  FileOutput,
  Wrench,
  BarChart3,
  Settings2,
  LogOut,
  Moon,
  Sun,
  QrCode,
  Bell,
  Download,
  RefreshCw,
  PartyPopper,
  Pencil,
  Trash2,
  Plus,
  Save,
  Loader2,
  Search,
  Building2,
  Tag,
  Shield,
  User,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';

/**
 * Returns a Lucide icon component by name or ID.
 */
export function getNavIcon(id, size = 18, className = '') {
  switch (id) {
    case 'panel':
      return <LayoutDashboard size={size} className={className} />;
    case 'inventario':
      return <Archive size={size} className={className} />;
    case 'laboratorios':
      return <FlaskConical size={size} className={className} />;
    case 'inmobiliario':
      return <Armchair size={size} className={className} />;
    case 'consumibles':
      return <Package size={size} className={className} />;
    case 'auditoria':
      return <ScanSearch size={size} className={className} />;
    case 'personal':
      return <Users size={size} className={className} />;
    case 'catalogos':
      return <FolderOpen size={size} className={className} />;
    case 'resguardos':
      return <ClipboardList size={size} className={className} />;
    case 'vales':
      return <FileOutput size={size} className={className} />;
    case 'mantenimientos':
      return <Wrench size={size} className={className} />;
    case 'reportes':
      return <BarChart3 size={size} className={className} />;
    default:
      return <HelpCircle size={size} className={className} />;
  }
}

export function getStatIcon(key, size = 20, className = '') {
  switch (key) {
    case 'bienes':
    case 'total':
    case '🗂':
      return <Archive size={size} className={className} />;
    case 'activos':
    case '🟢':
    case '✅':
      return <CheckCircle2 size={size} className={className} />;
    case 'mantenimiento':
    case '🔧':
    case '🛠️':
      return <Wrench size={size} className={className} />;
    case 'baja':
    case '🔴':
    case '⚠️':
      return <AlertTriangle size={size} className={className} />;
    case 'valor':
    case '💰':
      return <BarChart3 size={size} className={className} />; // Or another icon
    case 'areas':
    case '🏫':
      return <Building2 size={size} className={className} />;
    case 'resguardos':
    case '📋':
      return <ClipboardList size={size} className={className} />;
    case 'stock-bajo':
      return <AlertTriangle size={size} className={className} />;
    case 'sin-stock':
      return <AlertTriangle size={size} className={className} />;
    case 'consumibles':
    case '📦':
      return <Package size={size} className={className} />;
    case 'muebles':
    case '🪑':
      return <Armchair size={size} className={className} />;
    case 'vales':
    case '⏱️':
      return <FileOutput size={size} className={className} />;
    default:
      return <HelpCircle size={size} className={className} />;
  }
}
