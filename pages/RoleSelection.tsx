
import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { DeviceRole } from '../types';
import * as Icons from '../components/Icons';

export const RoleSelection: React.FC = () => {
  const { setDeviceRole, state, setServerIp } = useQueue();
  const [step, setStep] = useState<'ROLE' | 'NETWORK'>('ROLE');
  const [selectedRole, setSelectedRole] = useState<DeviceRole>('UNSET');
  const [ipInput, setIpInput] = useState(state.serverIp || window.location.hostname || 'localhost');

  // Auto-connect for Admin role
  useEffect(() => {
      if (selectedRole === 'ADMIN') {
          // If Admin is selected, assume localhost/self and save immediately to reduce friction
          handleConnect();
      }
  }, [selectedRole]);

  const handleRoleSelect = (role: DeviceRole) => {
    setSelectedRole(role);
    if (role !== 'ADMIN') {
        setStep('NETWORK');
    }
  };

  const handleConnect = () => {
    // Save IP preference
    setServerIp(ipInput);
    // This commits the role to persistent storage
    setDeviceRole(selectedRole);
  };

  const RoleCard = ({ role, icon: Icon, title, desc, color }: { role: DeviceRole, icon: any, title: string, desc: string, color: string }) => (
    <button 
      onClick={() => handleRoleSelect(role)}
      className={`group relative overflow-hidden bg-white p-5 rounded-3xl border-2 border-slate-100 hover:border-${color}-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left flex flex-col h-full min-h-[140px] justify-between`}
    >
      <div className={`absolute top-0 right-0 p-20 rounded-full bg-${color}-500/5 group-hover:bg-${color}-500/10 transition-colors -mr-6 -mt-6 pointer-events-none`} />
      
      <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      
      <div className="relative z-10">
        <h3 className="text-base font-black text-slate-900 mb-1 leading-tight">{title}</h3>
        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </button>
  );

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl p-6 flex flex-col justify-center min-h-[500px]">
        
        {step === 'ROLE' ? (
          <>
            <header className="text-center mb-8 animate-in slide-in-from-bottom-4 duration-700 shrink-0">
              <div className="inline-flex items-center gap-2 mb-2 opacity-50">
                 <Icons.Cpu size={18} />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">Device Setup</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">Identify This Station</h1>
              <p className="text-sm text-slate-500 max-w-lg mx-auto">Select the role for this device. This will be remembered.</p>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-8 duration-1000 delay-100">
               <RoleCard 
                 role="ADMIN"
                 icon={Icons.LayoutDashboard}
                 title="Admin & Server"
                 desc="Main control unit. Auto-connects."
                 color="amber"
               />
               <RoleCard 
                 role="RECEPTION"
                 icon={Icons.Zap}
                 title="Reception Console"
                 desc="Instant token issuance for staff."
                 color="pink"
               />
               <RoleCard 
                 role="KIOSK"
                 icon={Icons.MonitorPlay}
                 title="Patient Kiosk"
                 desc="Self-service token generation station."
                 color="blue"
               />
               <RoleCard 
                 role="COUNTER"
                 icon={Icons.Stethoscope}
                 title="Staff Counter"
                 desc="Doctor/Staff queue management."
                 color="emerald"
               />
               <RoleCard 
                 role="DISPLAY"
                 icon={Icons.Users}
                 title="Waiting Hall"
                 desc="Main public display screen."
                 color="purple"
               />
               <RoleCard 
                 role="ROOM_DISPLAY"
                 icon={Icons.MonitorPlay}
                 title="Room Screen"
                 desc="Small display above counter."
                 color="cyan"
               />
               <RoleCard 
                 role="DOOR_DISPLAY"
                 icon={Icons.Layout}
                 title="Door Sign"
                 desc="Entrance status signage."
                 color="rose"
               />
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto w-full bg-white p-8 rounded-3xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-right-8 duration-500">
             <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Icons.Wifi size={24} /></div>
                <div>
                   <h2 className="text-xl font-black text-slate-900 leading-none">Network Setup</h2>
                   <p className="text-xs text-slate-500 mt-1 font-medium">Connect to the Queue Server</p>
                </div>
             </div>

             <div className="space-y-4">
                <div className={`p-4 rounded-xl border-2 border-blue-500 bg-blue-50 ring-2 ring-blue-100`}>
                   <span className="block font-bold text-slate-800 text-sm mb-2">Queue Server IP Address</span>
                   <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-sm">ws://</span>
                      <input 
                        type="text" 
                        value={ipInput} 
                        onChange={(e) => setIpInput(e.target.value)}
                        placeholder="192.168.1.X" 
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-slate-400 font-mono text-sm">:3001</span>
                   </div>
                   <p className="text-[10px] text-slate-500 mt-2">Use <strong>localhost</strong> if this is the main server PC.</p>
                </div>
             </div>

             <div className="flex gap-3 mt-8">
                <button onClick={() => setStep('ROLE')} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-colors">Back</button>
                <button onClick={handleConnect} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors">Connect & Save</button>
             </div>
          </div>
        )}
        
        <footer className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest opacity-50 shrink-0">
           <div>{state.clinicName} • System v2.2</div>
        </footer>
      </div>
    </div>
  );
};
