
import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { MonitorPlay, Settings, Stethoscope, Menu, XCircle, LogOut, PanelLeftClose, ChevronRight, Eye, LayoutDashboard, ExternalLink, Wifi, WifiOff, FileBarChart, Home, Cpu, AlertTriangle } from './Icons';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { state, isEditMode, isNetworkSync, isOnline, setIsEditMode, updateClinicDetails, setDeviceRole } = useQueue();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const showEng = state.systemLanguage !== 'URDU';
  const showUrdu = state.systemLanguage !== 'ENGLISH';

  const handleOpenExternalDisplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    // In Admin mode, we launch display in a new tab without query params
    window.open(`${window.location.origin}${window.location.pathname}?view=display`, '_blank', 'noopener,noreferrer');
  };

  const NavItem = ({ id, icon: Icon, label, labelUrdu, canPopout }: any) => (
    <div className="relative group/nav-item">
      <button onClick={() => { onTabChange(id); setIsSidebarOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left group ${activeTab === id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
        <Icon size={20} className="shrink-0 transition-transform group-hover:scale-110" />
        <div className="flex flex-col whitespace-nowrap">
            {showEng && <span className="font-medium leading-none text-sm">{label}</span>}
            {showUrdu && <span className={`font-serif text-xs opacity-90 ${showEng ? 'mt-1' : ''}`}>{labelUrdu}</span>}
        </div>
      </button>
      {canPopout && (
        <button onClick={handleOpenExternalDisplay} className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover/nav-item:opacity-100 transition-all hover:bg-white/20 ${activeTab === id ? 'text-white' : 'text-slate-400'}`}>
          <ExternalLink size={14} />
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex bg-slate-50 relative">
      {isEditMode && <div className="fixed top-0 left-0 right-0 h-1 bg-yellow-400 z-[100] animate-pulse" />}
      
      {/* Mobile Toggle */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white rounded-full shadow-md text-slate-600">
          {isSidebarOpen ? <XCircle /> : <Menu />}
        </button>
      </div>

      {/* Desktop Collapse Trigger (The Edge) */}
      <div 
        onClick={() => { setIsCollapsed(false); }} 
        className={`fixed top-0 left-0 bottom-0 z-[60] transition-all duration-300 ease-in-out cursor-pointer group/edge ${isCollapsed ? 'w-3 hover:w-8' : 'w-0 pointer-events-none'}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1 transition-all duration-300 ${isCollapsed ? 'bg-blue-500/10 group-hover/edge:bg-blue-500/40 group-hover/edge:w-1.5' : 'bg-transparent'}`} />
        <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover/edge:opacity-100 flex items-center justify-center">
          <div className="bg-blue-600 text-white p-1 rounded-r-lg shadow-lg transform -translate-x-full group-hover/edge:translate-x-0 transition-transform">
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-500 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative overflow-hidden ${isCollapsed ? 'md:w-0 md:border-none' : 'md:w-64'}`}>
        <div className="w-64 h-full flex flex-col relative bg-white">
          <div className="p-6 border-b border-slate-100 shrink-0">
             {isEditMode ? (
               <div className="space-y-2 mt-4">
                 <input 
                   value={state.clinicName} 
                   onChange={(e) => updateClinicDetails(e.target.value, state.clinicNameUrdu)} 
                   className="w-full text-lg font-black text-slate-800 tracking-tight border border-blue-300 rounded px-1 bg-blue-50 focus:outline-none" 
                 />
                 <input 
                   value={state.clinicNameUrdu} 
                   onChange={(e) => updateClinicDetails(state.clinicName, e.target.value)} 
                   className="w-full text-xs text-slate-400 text-right font-serif border border-blue-300 rounded px-1 bg-blue-50 focus:outline-none" 
                   dir="rtl" 
                 />
               </div>
             ) : (
               <div className="mt-2">
                 {showEng && <div className="text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{state.clinicName}</div>}
                 {showUrdu && <p className="text-sm text-slate-500 font-serif leading-none">{state.clinicNameUrdu}</p>}
               </div>
             )}
             <p className="text-[9px] font-black tracking-[0.2em] text-slate-300 uppercase mt-4">ADMIN CONSOLE</p>
          </div>

          <nav className="p-4 space-y-2 flex-1 overflow-y-auto custom-scrollbar">
             <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" labelUrdu="ڈیش بورڈ" />
             <NavItem id="reports" icon={FileBarChart} label="Reports & Analytics" labelUrdu="رپورٹس اور تجزیہ" />
             <NavItem id="counter" icon={Stethoscope} label="Staff View (Test)" labelUrdu="اسٹاف کاؤنٹر" />
             <NavItem id="kiosk" icon={MonitorPlay} label="Kiosk View (Test)" labelUrdu="کیوسک موڈ" />
             <NavItem id="settings" icon={Settings} label="Settings" labelUrdu="ترتیبات" />
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/80 shrink-0 space-y-2">
             
             {/* Offline Indicator */}
             {!isOnline && (
               <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 w-full animate-pulse">
                  <div className="shrink-0">
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-wider">No Internet</span>
                    <span className="text-[9px] opacity-80 leading-none">AI features disabled</span>
                  </div>
               </div>
             )}

             {/* Connection Status Indicator */}
             <div className={`flex items-center gap-3 p-3 rounded-xl border border-dashed transition-all w-full ${isNetworkSync ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-slate-100 text-slate-400'}`}>
                <div className="shrink-0">
                  {isNetworkSync ? <Wifi size={16} /> : <WifiOff size={16} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-wider">{isNetworkSync ? 'Network Sync Active' : 'Offline Mode'}</span>
                  <span className="text-[9px] opacity-70 leading-none">{isNetworkSync ? 'Updates are live' : 'Local storage only'}</span>
                </div>
             </div>

             <button 
               onClick={() => setIsEditMode(!isEditMode)} 
               className={`flex items-center gap-3 p-3 rounded-xl transition-all w-full border-2 ${isEditMode ? 'bg-yellow-50 border-yellow-400 text-yellow-700' : 'bg-white border-transparent text-slate-500 hover:text-blue-600'}`}
             >
               <div className={`p-1.5 rounded-lg ${isEditMode ? 'bg-yellow-400 text-white' : 'bg-slate-100 text-slate-400'}`}>
                 {isEditMode ? <Eye size={16} /> : <Settings size={16} />}
               </div>
               <div className="flex flex-col text-left">
                 <span className="text-xs font-bold uppercase">{isEditMode ? 'Lock Layout' : 'Unlock Editor'}</span>
               </div>
             </button>
             
             <button 
               onClick={() => setIsCollapsed(true)} 
               className="hidden md:flex items-center gap-3 text-slate-500 hover:text-blue-600 hover:bg-white p-3 rounded-xl transition-all w-full group"
             >
               <PanelLeftClose size={18} />
               <span className="text-xs font-bold">Hide Menu</span>
             </button>
             
             <button onClick={() => setDeviceRole('UNSET')} className="flex items-center gap-3 text-slate-400 hover:text-red-500 transition-colors w-full p-3 rounded-xl hover:bg-red-50 group">
               <Cpu size={18} />
               <span className="text-xs font-bold">Reset Device Role</span>
             </button>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Content Area */}
      <div className="flex-1 h-full overflow-hidden relative transition-all duration-300">
        {children}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};
