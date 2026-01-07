

import React, { useState, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { Token, TokenStatus, Gender, Department, Counter } from '../types';
import * as Icons from '../components/Icons';

type TimeRange = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';
type ReportLevel = 'HOSPITAL' | 'DEPARTMENT' | 'COUNTER';

// Simple SVG Line Chart Component
const SimpleLineChart = ({ data, color = "#10b981" }: { data: number[], color?: string }) => {
  if (!data || data.length === 0) return <div className="h-full flex items-center justify-center text-xs text-slate-300 uppercase font-bold">No Data</div>;
  const max = Math.max(...data, 5);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`M0,100 ${points.split(' ').map(p => 'L' + p).join(' ')} L100,100 Z`} fill={`url(#grad-${color})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {data.map((val, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * 100} cy={100 - (val / max) * 100} r="1.5" fill="white" stroke={color} strokeWidth="1" className="opacity-0 hover:opacity-100 transition-opacity" />
      ))}
    </svg>
  );
};

export const Reports: React.FC = () => {
  const { state } = useQueue();
  const [timeRange, setTimeRange] = useState<TimeRange>('TODAY');
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);

  // --- Filtering Logic ---
  const filteredTokens = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - 7)).getTime();
    const startOfMonth = new Date(now.setMonth(now.getMonth() - 1)).getTime();

    let tokens = state.tokens;

    // Time Filter
    if (timeRange === 'TODAY') tokens = tokens.filter(t => t.createdAt >= startOfDay);
    else if (timeRange === 'WEEK') tokens = tokens.filter(t => t.createdAt >= startOfWeek);
    else if (timeRange === 'MONTH') tokens = tokens.filter(t => t.createdAt >= startOfMonth);

    // Hierarchy Filter
    if (selectedCounterId) {
      tokens = tokens.filter(t => t.counterId === selectedCounterId);
    } else if (selectedDeptId) {
      tokens = tokens.filter(t => t.departmentId === selectedDeptId);
    }

    return tokens.sort((a, b) => b.createdAt - a.createdAt);
  }, [state.tokens, timeRange, selectedDeptId, selectedCounterId]);

  // --- Statistics Calculations ---
  const stats = useMemo(() => {
    const total = filteredTokens.length;
    const served = filteredTokens.filter(t => t.status === TokenStatus.COMPLETED).length;
    const waiting = filteredTokens.filter(t => t.status === TokenStatus.WAITING).length;
    const missed = filteredTokens.filter(t => t.status === TokenStatus.MISSED).length;
    
    // Wait Time (Created -> First Served)
    const servedTokens = filteredTokens.filter(t => (t.firstServedAt || t.servedAt) && t.createdAt);
    const avgWait = servedTokens.length > 0 
      ? Math.round(servedTokens.reduce((acc, t) => {
          const endTime = t.firstServedAt || t.servedAt!;
          return acc + Math.max(0, endTime - t.createdAt);
        }, 0) / servedTokens.length / 60000) 
      : 0;

    // Service Time (Served -> Completed)
    const completedTokens = filteredTokens.filter(t => t.status === TokenStatus.COMPLETED);
    const avgService = completedTokens.length > 0
      ? Math.round(completedTokens.reduce((acc, t) => {
          const duration = t.totalDuration || (t.completedAt && t.servedAt ? t.completedAt - t.servedAt : 0);
          return acc + duration;
        }, 0) / completedTokens.length / 60000)
      : 0;

    return { total, served, waiting, missed, avgWait, avgService };
  }, [filteredTokens]);

  // --- Chart Data Preparation ---
  const hourlyData = useMemo(() => {
    const hours = new Array(12).fill(0); // Show last 12 hours relative to now, or fixed 8am-8pm
    // Simple logic: buckets by hour of day
    const distribution = new Array(24).fill(0);
    filteredTokens.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      distribution[h]++;
    });
    // Return traffic for 8 AM to 8 PM
    return distribution.slice(8, 20); 
  }, [filteredTokens]);

  // --- Breakdown List ---
  const breakdownItems = useMemo(() => {
    if (selectedCounterId) return []; // Lowest level, show raw log instead
    if (selectedDeptId) {
      // Show Counters in this Dept
      return state.counters
        .filter(c => c.departmentId === selectedDeptId)
        .map(c => {
          const cTokens = filteredTokens.filter(t => t.counterId === c.id || (t.status === TokenStatus.WAITING && t.departmentId === c.departmentId)); // Rough attribution
          const served = cTokens.filter(t => t.status === TokenStatus.COMPLETED).length;
          return { id: c.id, name: c.name, count: served, sub: 'Patients Served', type: 'COUNTER' };
        });
    }
    // Show Departments
    return state.departments.map(d => {
      const dTokens = filteredTokens.filter(t => t.departmentId === d.id);
      const total = dTokens.length;
      return { id: d.id, name: d.name, count: total, sub: 'Total Visits', type: 'DEPARTMENT' };
    });
  }, [state.counters, state.departments, filteredTokens, selectedDeptId, selectedCounterId]);

  const handlePrint = () => {
    window.print();
  };

  const breadcrumbs = useMemo(() => {
    const crumbs = [{ id: 'hospital', label: state.clinicName, onClick: () => { setSelectedDeptId(null); setSelectedCounterId(null); } }];
    if (selectedDeptId) {
      const d = state.departments.find(x => x.id === selectedDeptId);
      crumbs.push({ id: d?.id || 'dept', label: d?.name || 'Department', onClick: () => setSelectedCounterId(null) });
    }
    if (selectedCounterId) {
      const c = state.counters.find(x => x.id === selectedCounterId);
      crumbs.push({ id: c?.id || 'cnt', label: c?.name || 'Doctor', onClick: () => {} });
    }
    return crumbs;
  }, [selectedDeptId, selectedCounterId, state.departments, state.counters, state.clinicName]);

  return (
    <div className="h-full bg-[#f8fafc] overflow-y-auto p-6 md:p-8 flex flex-col font-sans print:bg-white print:p-0">
      
      {/* Header & Controls */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Icons.FileBarChart className="text-blue-600" /> Reporting Engine
          </h1>
          <nav className="flex items-center gap-2 mt-2 text-sm font-medium text-slate-500">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                {i > 0 && <Icons.ChevronRight size={14} className="text-slate-300" />}
                <button 
                  onClick={crumb.onClick}
                  className={`hover:text-blue-600 transition-colors ${i === breadcrumbs.length - 1 ? 'text-slate-800 font-bold pointer-events-none' : ''}`}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3">
           <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
              {(['TODAY', 'WEEK', 'MONTH', 'ALL'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeRange === r ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                >
                  {r}
                </button>
              ))}
           </div>
           <button onClick={handlePrint} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm">
              <Icons.Printer size={18} />
           </button>
           <button className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
              <Icons.Download size={18} />
           </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 print:grid-cols-4 print:gap-4">
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg print:hidden"><Icons.Users size={18} /></div>
               <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Volume</span>
            </div>
            <div className="text-4xl font-black text-slate-800">{stats.total}</div>
            <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1"><Icons.TrendingUp size={12} /> {stats.served} Served</div>
         </div>
         
         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-amber-50 text-amber-600 rounded-lg print:hidden"><Icons.Clock size={18} /></div>
               <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Avg Wait</span>
            </div>
            <div className="text-4xl font-black text-slate-800">{stats.avgWait}<span className="text-lg text-slate-400 ml-1">m</span></div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Target: 15m</div>
         </div>

         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg print:hidden"><Icons.Stethoscope size={18} /></div>
               <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Avg Service</span>
            </div>
            <div className="text-4xl font-black text-slate-800">{stats.avgService}<span className="text-lg text-slate-400 ml-1">m</span></div>
            <div className="text-[10px] text-slate-400 font-bold mt-1">Per Patient</div>
         </div>

         <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm print:border-slate-300">
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-red-50 text-red-600 rounded-lg print:hidden"><Icons.UserX size={18} /></div>
               <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Missed</span>
            </div>
            <div className="text-4xl font-black text-slate-800">{stats.missed}</div>
            <div className="text-[10px] text-red-400 font-bold mt-1">No Shows</div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 print:block">
         {/* Traffic Chart */}
         <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm print:mb-6 print:border-slate-300">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-800 flex items-center gap-2"><Icons.Activity size={18} className="text-slate-400" /> Traffic Trend (8 AM - 8 PM)</h3>
            </div>
            <div className="h-48 w-full">
               <SimpleLineChart data={hourlyData} color="#3b82f6" />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-mono uppercase">
               <span>8 AM</span>
               <span>2 PM</span>
               <span>8 PM</span>
            </div>
         </div>

         {/* Breakdown List (Drill Down) */}
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col print:mb-6 print:border-slate-300">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               {selectedCounterId ? <Icons.List size={18} className="text-slate-400" /> : <Icons.PieChart size={18} className="text-slate-400" />}
               {selectedDeptId ? 'Counters Performance' : 'Department Load'}
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
               {selectedCounterId ? (
                  <div className="text-center py-10 text-slate-400 text-sm">Individual Token History View</div>
               ) : (
                 breakdownItems.map((item) => (
                   <button 
                     key={item.id}
                     onClick={() => item.type === 'DEPARTMENT' ? setSelectedDeptId(item.id) : setSelectedCounterId(item.id)}
                     className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50 hover:border-blue-100 hover:shadow-md transition-all group"
                   >
                      <div className="text-left">
                         <div className="font-bold text-slate-800 group-hover:text-blue-700">{item.name}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{item.sub}</div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-xl font-black text-slate-700">{item.count}</span>
                         <Icons.ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                      </div>
                   </button>
                 ))
               )}
               {breakdownItems.length === 0 && !selectedCounterId && <div className="text-center opacity-50 py-4 text-xs">No Data Available</div>}
            </div>
         </div>
      </div>

      {/* Detailed Log Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden print:border-slate-300">
         <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Detailed Patient Log</h3>
            <span className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">{filteredTokens.length} Records</span>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <tr>
                     <th className="px-6 py-4">Token</th>
                     <th className="px-6 py-4">Department</th>
                     <th className="px-6 py-4">Counter</th>
                     <th className="px-6 py-4">Time In</th>
                     <th className="px-6 py-4">Wait</th>
                     <th className="px-6 py-4">Duration</th>
                     <th className="px-6 py-4">Status</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredTokens.slice(0, 50).map((token) => {
                     const dept = state.departments.find(d => d.id === token.departmentId);
                     const counter = state.counters.find(c => c.id === token.counterId);
                     const waitTime = (token.firstServedAt || token.servedAt) ? Math.round(((token.firstServedAt || token.servedAt!) - token.createdAt) / 60000) : '-';
                     const duration = token.totalDuration ? Math.round(token.totalDuration / 60000) : (token.completedAt && token.servedAt ? Math.round((token.completedAt - token.servedAt) / 60000) : '-');
                     
                     return (
                        <tr key={token.id} className="hover:bg-blue-50/30 transition-colors">
                           <td className="px-6 py-4 font-mono font-bold text-slate-700">{token.ticketNumber}</td>
                           <td className="px-6 py-4 text-slate-600 font-medium">{dept?.name}</td>
                           <td className="px-6 py-4 text-slate-500">{counter?.name || '-'}</td>
                           <td className="px-6 py-4 text-slate-400 tabular-nums">{new Date(token.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
                           <td className="px-6 py-4 text-slate-600 tabular-nums">{waitTime !== '-' ? `${waitTime}m` : '-'}</td>
                           <td className="px-6 py-4 text-slate-600 tabular-nums">{duration !== '-' ? `${duration}m` : '-'}</td>
                           <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                                 token.status === TokenStatus.COMPLETED ? 'bg-emerald-100 text-emerald-700' :
                                 token.status === TokenStatus.SERVING ? 'bg-blue-100 text-blue-700' :
                                 token.status === TokenStatus.MISSED ? 'bg-red-100 text-red-700' :
                                 'bg-slate-100 text-slate-500'
                              }`}>
                                 {token.status}
                              </span>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
            {filteredTokens.length === 0 && <div className="p-10 text-center text-slate-400 text-sm font-medium">No records found for this period.</div>}
         </div>
      </div>
    </div>
  );
};