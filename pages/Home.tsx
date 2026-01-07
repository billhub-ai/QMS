
import React from 'react';
import { useQueue } from '../context/QueueContext';
import * as Icons from '../components/Icons';

interface HomeProps {
  onNavigate: (tab: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { state } = useQueue();

  const RoleCard = ({ 
    icon: Icon, 
    title, 
    description, 
    target, 
    color,
    badge
  }: { 
    icon: any, 
    title: string, 
    description: string, 
    target: string, 
    color: string,
    badge?: string
  }) => (
    <button 
      onClick={() => onNavigate(target)}
      className="relative group overflow-hidden bg-white p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 hover:border-blue-200 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full"
    >
      <div className={`absolute top-0 right-0 p-32 rounded-full bg-${color}-500/5 group-hover:bg-${color}-500/10 transition-colors -mr-10 -mt-10 pointer-events-none`} />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600 group-hover:scale-110 transition-transform shadow-sm`}>
          <Icon size={32} />
        </div>
        {badge && (
          <span className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {badge}
          </span>
        )}
      </div>
      
      <div className="mt-auto relative z-10">
        <h3 className="text-2xl font-black text-slate-800 mb-2 leading-tight group-hover:text-blue-700 transition-colors">
          {title}
        </h3>
        <p className="text-slate-500 text-sm font-medium leading-relaxed">
          {description}
        </p>
      </div>

      <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 text-blue-500">
        <Icons.ArrowRight size={24} />
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
         <Icons.Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] text-slate-900 rotate-12" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 md:py-20 flex-1 flex flex-col">
        
        <header className="text-center mb-16 md:mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-3 bg-white px-6 py-2 rounded-full shadow-sm border border-slate-200 mb-6">
             <Icons.Building size={16} className="text-blue-500" />
             <span className="text-xs font-black uppercase tracking-widest text-slate-500">{state.clinicName}</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight mb-4 leading-none">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-500">ZenQueue</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">
            Select your interface to get started.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
           <RoleCard 
             icon={Icons.MonitorPlay}
             title="Patient Kiosk"
             description="Self-service station for patients to generate tokens and select departments."
             target="kiosk"
             color="blue"
             badge="Touch Screen"
           />
           <RoleCard 
             icon={Icons.Stethoscope}
             title="Staff Station"
             description="For doctors and staff to call patients, manage queues, and track status."
             target="counter"
             color="emerald"
             badge="Restricted"
           />
           <RoleCard 
             icon={Icons.Users}
             title="Waiting Display"
             description="Public screen for waiting halls showing current tokens and clinic status."
             target="display"
             color="purple"
             badge="Full Screen"
           />
           <RoleCard 
             icon={Icons.LayoutDashboard}
             title="Operations"
             description="Admin dashboard for analytics, configuration, and system reports."
             target="dashboard"
             color="amber"
             badge="Admin"
           />
        </div>

        <div className="mt-12 md:mt-16 text-center animate-in fade-in delay-300">
           <div className="inline-flex flex-wrap justify-center gap-4">
              <button onClick={() => onNavigate('counter-display')} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <Icons.MonitorPlay size={14} /> Room Screen
              </button>
              <button onClick={() => onNavigate('door-display')} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <Icons.Layout size={14} /> Door Sign
              </button>
              <button onClick={() => onNavigate('reports')} className="px-5 py-2.5 rounded-xl bg-slate-200 text-slate-600 hover:bg-white hover:shadow-lg hover:text-blue-600 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <Icons.FileBarChart size={14} /> Daily Reports
              </button>
           </div>
        </div>

        <footer className="mt-auto pt-16 text-center opacity-40">
           <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center gap-2">
             <Icons.Zap size={12} /> Powered by Gemini AI
           </p>
        </footer>

      </div>
    </div>
  );
};
