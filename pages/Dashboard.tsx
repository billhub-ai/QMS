

import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { getQueueInsights } from '../services/geminiService';
import { 
  BrainCircuit, Activity, LayoutDashboard, TrendingUp, 
  Users, CheckCircle, Clock, Timer, History, ArrowRight,
  TrendingDown, Zap, BarChart3, AlertCircle
} from '../components/Icons';
import { TokenStatus } from '../types';

export const Dashboard: React.FC = () => {
  const { state } = useQueue();
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchInsights = async () => {
    setLoadingInsight(true);
    try {
      const result = await getQueueInsights(state.departments, state.counters, state.tokens);
      setInsight(result);
    } catch (err) {
      setInsight("Error generating insights. Please check your connection.");
    } finally {
      setLoadingInsight(false);
    }
  };

  const waitingCount = state.tokens.filter(t => t.status === TokenStatus.WAITING).length;
  const servedCount = state.tokens.filter(t => t.status === TokenStatus.COMPLETED).length;
  const servingCount = state.tokens.filter(t => t.status === TokenStatus.SERVING).length;
  
  // Robust Avg Wait Time Calculation
  // Filters for tokens that have a valid 'servedAt' time (meaning they have been served)
  // Includes both COMPLETED and SERVING statuses.
  // Uses firstServedAt to ensure wait time is based on initial call, not recalls.
  const servedTokens = state.tokens.filter(t => (t.status === TokenStatus.COMPLETED || t.status === TokenStatus.SERVING) && (t.firstServedAt || t.servedAt) && t.createdAt);
  
  const avgWait = servedTokens.length > 0 
    ? Math.round(servedTokens.reduce((acc, t) => {
        const endTime = t.firstServedAt || t.servedAt!;
        return acc + Math.max(0, endTime - t.createdAt);
      }, 0) / servedTokens.length / 60000)
    : 0;

  const onlineCounters = state.counters.filter(c => c.isOnline).length;

  return (
    <div className="h-full bg-[#f8fafc] overflow-y-auto p-6 md:p-10">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Analytics</h1>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <Activity size={16} className="text-emerald-500" />
            Operational intelligence for {state.clinicName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${onlineCounters > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-black uppercase tracking-widest text-slate-600">{onlineCounters} Counters Online</span>
          </div>
        </div>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Waiting', val: waitingCount, icon: Users, color: 'blue', sub: 'Active Queue' },
          { label: 'Served', val: servedCount, icon: CheckCircle, color: 'emerald', sub: 'Completed' },
          { label: 'In Session', val: servingCount, icon: Zap, color: 'amber', sub: 'Current Flow' },
          { label: 'Avg Wait', val: `${avgWait}m`, icon: Timer, color: 'purple', sub: 'Target: <15m' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
            <div className="flex items-center gap-4">
              <div className={`p-4 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-3xl group-hover:scale-110 transition-transform`}>
                <kpi.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{kpi.label}</p>
                <p className="text-3xl font-black text-slate-900 leading-none">{kpi.val}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: AI & Departments */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Strategy Briefing (Gemini AI) */}
          <div className="relative group">
            {!insight ? (
              <div 
                className="bg-white border-2 border-dashed border-indigo-200 rounded-[3rem] p-12 text-center hover:border-indigo-400 transition-all cursor-pointer group/card" 
                onClick={fetchInsights}
              >
                 <div className="bg-indigo-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-indigo-500 group-hover/card:scale-110 transition-transform shadow-inner">
                    <BrainCircuit size={48} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-800 mb-2">Request Strategy Briefing</h3>
                 <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">Gemini will analyze your department loads and counter activity to optimize patient flow.</p>
                 <button className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 mx-auto uppercase tracking-widest text-xs">
                   {loadingInsight ? (
                     <><RefreshCcw size={16} className="animate-spin" /> Analyzing Dynamics...</>
                   ) : (
                     <><Zap size={16} /> Start Analysis</>
                   )}
                 </button>
              </div>
            ) : (
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden border border-white/5 animate-in slide-in-from-top-4 duration-700">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/10 pointer-events-none" />
                 <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-4 text-indigo-400">
                      <div className="p-3 bg-indigo-500/20 rounded-2xl border border-white/5"><BrainCircuit size={24} /></div>
                      <div>
                        <h3 className="font-black tracking-[0.2em] uppercase text-xs">AI Operations Intelligence</h3>
                        <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Powered by Gemini Flash</p>
                      </div>
                    </div>
                    <button onClick={fetchInsights} className="text-[10px] font-black uppercase tracking-widest bg-white/10 hover:bg-white/20 px-6 py-3 rounded-2xl transition-all border border-white/5">
                      Refresh Briefing
                    </button>
                 </div>
                 <div className="prose prose-invert max-w-none relative z-10">
                   <p className="whitespace-pre-line text-lg md:text-xl leading-relaxed font-light text-slate-200">{insight}</p>
                 </div>
              </div>
            )}
          </div>

          {/* Department Loads */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 md:p-10">
             <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-slate-100 rounded-2xl text-slate-500"><BarChart3 size={24} /></div>
                   <h3 className="text-2xl font-black text-slate-900">Load Heatmap</h3>
                </div>
                <div className="flex gap-2">
                   <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">Live Feedback</span>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {state.departments.filter(d => d.isActive !== false).map(dept => {
                  const waiting = state.tokens.filter(t => t.departmentId === dept.id && t.status === TokenStatus.WAITING).length;
                  const total = state.tokens.filter(t => t.departmentId === dept.id).length;
                  const cleared = total - waiting;
                  const percent = total > 0 ? Math.round((cleared / total) * 100) : 0;
                  
                  return (
                    <div key={dept.id} className="p-6 rounded-3xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:shadow-lg hover:shadow-slate-100 transition-all group border-b-4" style={{ borderColor: `var(--tw-color-${dept.color}-500)` } as any}>
                       <div className="flex justify-between items-start mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-${dept.color}-50 text-${dept.color}-600 flex items-center justify-center shadow-sm`}>
                             <Users size={24} />
                          </div>
                          <div className="text-right">
                             <p className="text-2xl font-black text-slate-900 leading-none">{percent}%</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Cleared</p>
                          </div>
                       </div>
                       <h4 className="font-black text-slate-800 mb-1 truncate">{dept.name}</h4>
                       <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                          <span>{cleared} / {total} Patients</span>
                          <span>{waiting} Pending</span>
                       </div>
                       <div className="w-full h-2.5 bg-slate-200/50 rounded-full overflow-hidden p-[2px]">
                          <div className={`h-full bg-${dept.color}-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]`} style={{ width: `${percent}%` }} />
                       </div>
                    </div>
                  );
               })}
             </div>
          </div>
        </div>

        {/* Right Column: Activity Feed */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col h-full max-h-[800px]">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                 <History size={20} className="text-slate-400" /> 
                 Live Logs
              </h3>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
           </div>
           
           <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {state.tokens.filter(t => t.status !== TokenStatus.WAITING).sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0)).slice(0, 10).map((token, i) => {
                const dept = state.departments.find(d => d.id === token.departmentId);
                const counter = state.counters.find(c => c.id === token.counterId);
                return (
                  <div key={token.id} className="flex gap-5 relative group">
                     {i < 9 && <div className="absolute left-[11px] top-8 bottom-[-24px] w-px bg-slate-100 group-hover:bg-slate-200 transition-colors" />}
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm 
                       ${token.status === TokenStatus.COMPLETED ? 'bg-emerald-100 text-emerald-600' : 
                         token.status === TokenStatus.SERVING ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}
                     >
                        <div className="w-2 h-2 rounded-full bg-current" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-black text-slate-800">
                             Token <span className="font-mono text-blue-600">{token.ticketNumber}</span>
                          </p>
                          <span className="text-[10px] font-black text-slate-300 tabular-nums">
                            {new Date(token.servedAt || token.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium truncate">
                           {token.status === TokenStatus.COMPLETED ? 'Finished exam' : 'Called'} at {counter?.name || 'Counter'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <div className={`w-1.5 h-1.5 rounded-full bg-${dept?.color}-400`} />
                           <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{dept?.name}</span>
                        </div>
                     </div>
                  </div>
                );
              })}
              {state.tokens.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                   <Activity size={48} className="mb-4" />
                   <p className="text-sm font-bold uppercase tracking-widest">Standby Mode</p>
                   <p className="text-xs">Waiting for activity...</p>
                </div>
              )}
           </div>
           
           <div className="mt-8 pt-6 border-t border-slate-50">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Rating</span>
                   <span className="text-xs font-black text-slate-700">84%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                   <div className="h-full bg-emerald-500 w-[84%] rounded-full" />
                </div>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

const RefreshCcw = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);