import React from 'react';
import * as LucideIcons from 'lucide-react';

const {
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
} = LucideIcons;

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

export function DynamicIcon({ name, size = 16, className = '', style = {}, ...props }) {
  if (!name) return null;
  const IconComponent = LucideIcons[name];
  if (IconComponent) {
    return <IconComponent size={size} className={className} style={style} {...props} />;
  }
  return (
    <span
      className={className}
      style={{
        fontSize: size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      {...props}
    >
      {name}
    </span>
  );
}

export const AVAILABLE_LUCIDE_ICONS = [
  // Lugares / Áreas / Infraestructura
  'Building2', 'MapPin', 'School', 'Warehouse', 'Home', 'Compass', 'Map', 'Navigation', 'Globe',
  // Equipos / TI / Oficina
  'Laptop', 'Monitor', 'Tv', 'Smartphone', 'Tablet', 'Printer', 'Mouse', 'HardDrive', 'Cpu', 'Server', 'Wifi', 'Keyboard', 'Projector', 'Camera', 'Video', 'Mic', 'Headphones',
  // Mobiliario / Espacios
  'Armchair', 'Lamp', 'Columns', 'Grid', 'Trash2',
  // Herramientas / Mantenimiento
  'Wrench', 'Settings', 'Hammer', 'Scissors', 'Shield', 'Key', 'Activity', 'Gauge',
  // Materiales / Consumibles / Documentos
  'FileText', 'Layers', 'Tag', 'Archive', 'Package', 'Folder', 'Briefcase', 'ClipboardList', 'BookOpen', 'GraduationCap',
  // Roles / Varios
  'User', 'Users', 'Award', 'ShieldCheck', 'BarChart3', 'Sparkles', 'Palette', 'Lightbulb', 'Megaphone', 'Heart'
];
