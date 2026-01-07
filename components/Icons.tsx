import React from 'react';
import { 
  Users, 
  MonitorPlay, 
  Printer, 
  Settings, 
  Stethoscope, 
  Activity, 
  Trash2, 
  Mic, 
  UserPlus,
  Play,
  CheckCircle,
  XCircle,
  Menu,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  BrainCircuit,
  Volume2,
  Plus,
  HeartPulse,
  Baby,
  Eye,
  EyeOff,
  Bone,
  Pill,
  Syringe,
  Thermometer,
  FileText,
  BriefcaseMedical,
  Accessibility,
  Upload,
  Image,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Calendar,
  Bell,
  History,
  Siren,
  CornerUpLeft,
  CornerUpRight,
  Building,
  ArrowRightCircle,
  PauseCircle,
  SkipForward,
  UserX,
  RefreshCcw,
  AlertTriangle,
  ExternalLink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  Edit3,
  Globe,
  TrendingUp,
  Timer,
  TrendingDown,
  Zap,
  BarChart3,
  AlertCircle,
  Save,
  Layout,
  Type,
  Palette,
  ArrowDownUp,
  ToggleLeft,
  ToggleRight,
  Coffee,
  Star,
  Wifi,
  WifiOff,
  Scissors,
  Ear,
  Microscope,
  TestTube,
  Smile,
  Droplet,
  Megaphone,
  FileBarChart,
  ChevronDown,
  Download,
  PieChart,
  Filter,
  List,
  Home,
  Cpu,
  Shield,
  Medal,
  Crown,
  Layers,
  Radiation,
  Scan,
  Aperture,
  Waves,
  Search,
  Minimize2,
  Maximize2,
  ZoomIn,
  Link
} from 'lucide-react';

export const Male = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="10" cy="14" r="5" />
    <path d="M21 3l-6.5 6.5" />
    <path d="M15 3h6v6" />
  </svg>
);

export const Female = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="10" r="5" />
    <path d="M12 15v6" />
    <path d="M9 18h6" />
  </svg>
);

export const CTIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="11" r="8" />
    <path d="M2 19h20" />
    <path d="M6 19v-3h12v3" />
    <circle cx="12" cy="11" r="3" opacity="0.5" />
  </svg>
);

export const MRIIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="12" cy="12" r="5" />
    <path d="M3 12h3" />
    <path d="M18 12h3" />
  </svg>
);

export const UltrasoundIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 2v8" />
    <path d="M9 10h6a2 2 0 0 1 2 2v2H7v-2a2 2 0 0 1 2-2z" />
    <path d="M6 18a8 8 0 0 1 12 0" />
    <path d="M3 21a11 11 0 0 1 18 0" />
  </svg>
);

export const MammographyIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M5 21h14" />
    <path d="M7 21V3" />
    <path d="M7 7h9" />
    <path d="M7 15h9" />
    <path d="M12 15a4 4 0 0 1 0-8" />
  </svg>
);

export const BreastIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M20.3 12.6C20.8 11.8 21 10.9 21 10c0-5-4-9-9-9S3 5 3 10c0 .9.2 1.8.7 2.6" />
    <path d="M20.3 12.6A9 9 0 0 1 12 21a9 9 0 0 1-8.3-8.4" />
    <circle cx="12" cy="11" r="2" />
  </svg>
);

export const FetusIcon = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number | string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M16 14a4 4 0 0 0-8 0" /> {/* Head shape */}
    <path d="M8 14c0 3 2 5 4 5s4-2 4-5" />
    <circle cx="14" cy="12" r="1.5" fill="currentColor" className="opacity-50" /> {/* Eye */}
    <path d="M12 5c4 0 7 3 7 7" className="opacity-50" /> {/* Womb curve */}
    <path d="M5 12c0-4 3-7 7-7" className="opacity-50" />
  </svg>
);

export {
  Users, 
  MonitorPlay, 
  Printer, 
  Settings, 
  Stethoscope, 
  Activity, 
  Trash2, 
  Mic, 
  UserPlus, 
  Play, 
  CheckCircle, 
  XCircle, 
  Menu, 
  ChevronRight, 
  LayoutDashboard, 
  LogOut, 
  BrainCircuit, 
  Volume2, 
  Plus, 
  HeartPulse, 
  Baby, 
  Eye, 
  EyeOff, 
  Bone, 
  Pill, 
  Syringe, 
  Thermometer, 
  FileText, 
  BriefcaseMedical, 
  Accessibility, 
  Upload, 
  Image, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Minus, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Clock, 
  Calendar, 
  Bell, 
  History, 
  Siren, 
  CornerUpLeft, 
  CornerUpRight, 
  Building, 
  ArrowRightCircle, 
  PauseCircle, 
  SkipForward, 
  UserX, 
  RefreshCcw, 
  AlertTriangle, 
  ExternalLink, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Info, 
  Edit3, 
  Globe, 
  TrendingUp, 
  Timer, 
  TrendingDown, 
  Zap, 
  BarChart3, 
  AlertCircle, 
  Save, 
  Layout, 
  Type, 
  Palette, 
  ArrowDownUp, 
  ToggleLeft, 
  ToggleRight, 
  Coffee, 
  Star, 
  Wifi, 
  WifiOff, 
  Scissors, 
  Ear, 
  Microscope, 
  TestTube, 
  Smile, 
  Droplet, 
  Megaphone, 
  FileBarChart, 
  ChevronDown, 
  Download, 
  PieChart, 
  Filter, 
  List, 
  Home, 
  Cpu, 
  Shield, 
  Medal, 
  Crown, 
  Layers, 
  Radiation, 
  Scan, 
  Aperture, 
  Waves, 
  Search, 
  Minimize2, 
  Maximize2, 
  ZoomIn, 
  Link
};

// Map of string keys to icon components
const ICON_MAP: Record<string, React.ElementType> = {
  'users': Users,
  'monitor-play': MonitorPlay,
  'printer': Printer,
  'settings': Settings,
  'stethoscope': Stethoscope,
  'activity': Activity,
  'trash-2': Trash2,
  'mic': Mic,
  'user-plus': UserPlus,
  'play': Play,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'menu': Menu,
  'chevron-right': ChevronRight,
  'layout-dashboard': LayoutDashboard,
  'log-out': LogOut,
  'brain-circuit': BrainCircuit,
  'volume-2': Volume2,
  'plus': Plus,
  'heart-pulse': HeartPulse,
  'baby': Baby,
  'eye': Eye,
  'eye-off': EyeOff,
  'bone': Bone,
  'pill': Pill,
  'syringe': Syringe,
  'thermometer': Thermometer,
  'file-text': FileText,
  'briefcase-medical': BriefcaseMedical,
  'accessibility': Accessibility,
  'upload': Upload,
  'image': Image,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'minus': Minus,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  'clock': Clock,
  'calendar': Calendar,
  'bell': Bell,
  'history': History,
  'siren': Siren,
  'corner-up-left': CornerUpLeft,
  'corner-up-right': CornerUpRight,
  'building': Building,
  'arrow-right-circle': ArrowRightCircle,
  'pause-circle': PauseCircle,
  'skip-forward': SkipForward,
  'user-x': UserX,
  'refresh-ccw': RefreshCcw,
  'alert-triangle': AlertTriangle,
  'external-link': ExternalLink,
  'align-left': AlignLeft,
  'align-center': AlignCenter,
  'align-right': AlignRight,
  'info': Info,
  'edit-3': Edit3,
  'globe': Globe,
  'trending-up': TrendingUp,
  'timer': Timer,
  'trending-down': TrendingDown,
  'zap': Zap,
  'bar-chart-3': BarChart3,
  'alert-circle': AlertCircle,
  'save': Save,
  'layout': Layout,
  'type': Type,
  'palette': Palette,
  'arrow-down-up': ArrowDownUp,
  'toggle-left': ToggleLeft,
  'toggle-right': ToggleRight,
  'coffee': Coffee,
  'star': Star,
  'wifi': Wifi,
  'wifi-off': WifiOff,
  'scissors': Scissors,
  'ear': Ear,
  'microscope': Microscope,
  'test-tube': TestTube,
  'smile': Smile,
  'droplet': Droplet,
  'megaphone': Megaphone,
  'file-bar-chart': FileBarChart,
  'chevron-down': ChevronDown,
  'download': Download,
  'pie-chart': PieChart,
  'filter': Filter,
  'list': List,
  'home': Home,
  'cpu': Cpu,
  'shield': Shield,
  'medal': Medal,
  'crown': Crown,
  'layers': Layers,
  'radiation': Radiation,
  'scan': Scan,
  'aperture': Aperture,
  'waves': Waves,
  'search': Search,
  'minimize-2': Minimize2,
  'maximize-2': Maximize2,
  'zoom-in': ZoomIn,
  'link': Link,
  // Custom & Aliases
  'male': Male,
  'female': Female,
  'ct': CTIcon,
  'mri': MRIIcon,
  'ultrasound': UltrasoundIcon,
  'mammography': MammographyIcon,
  'breast': BreastIcon,
  'fetus': FetusIcon,
  'radiology': Radiation,
  'medical': BriefcaseMedical,
  'award': Medal,
  'user': Users,
  'user-check': CheckCircle,
  'brain': BrainCircuit,
};

export const getIcon = (key?: string): React.ElementType => {
  if (!key) return Activity;
  const lowerKey = key.toLowerCase();
  return ICON_MAP[lowerKey] || Activity;
};

export const DynamicIcon = ({ icon, customIcon, size = 24, className = "" }: { icon?: string; customIcon?: string; size?: number | string; className?: string }) => {
  if (customIcon) {
    const styleSize = typeof size === 'number' ? `${size}px` : size;
    return <img src={customIcon} alt="" style={{ width: styleSize, height: styleSize }} className={`object-contain ${className}`} />;
  }
  const IconComponent = getIcon(icon);
  return <IconComponent size={size} className={className} />;
};
