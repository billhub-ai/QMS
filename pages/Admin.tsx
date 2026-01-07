
import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { getQueueInsights } from '../services/geminiService';
import { 
  BrainCircuit, Activity, Trash2, LayoutDashboard, Settings, RefreshCcw, 
  AlertTriangle, XCircle, Printer, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff,
  Info, Edit3, Globe, ExternalLink, Plus, Users, CheckCircle
} from '../components/Icons';
import { SystemLanguage, PatientGroup } from '../types';

const SUPPORTED_COLORS = [
  'slate', 'red', 'orange', 'amber', 'yellow', 'lime', 
  'green', 'emerald', 'teal', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
  'pink', 'rose'
];

export const AdminDashboard: React.FC = () => {
  const { state, clearTokens, factoryReset, updateSystemLanguage, updatePrintSettings, updateClinicDetails, addPatientGroup, updatePatientGroup, removePatientGroup, updateDepartment } = useQueue();
  const [insight, setInsight] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState<'daily' | 'factory' | null>(null);

  // Mock states for the simulation in the preview
  const [mockDeptName, setMockDeptName] = useState("Officers Clinic");
  const [mockDeptNameUrdu, setMockDeptNameUrdu] = useState("افسران کلینک");
  const [simulatedLang, setSimulatedLang] = useState<SystemLanguage>('BOTH');

  // Group Editing State
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoadingInsight(true);
    const result = await getQueueInsights(state.departments, state.counters, state.tokens);
    setInsight(result);
    setLoadingInsight(false);
  };

  const handleDailyReset = () => {
    clearTokens();
    setShowResetConfirm(null);
  };

  const handleFactoryReset = () => {
    factoryReset();
    setShowResetConfirm(null);
  };

  const clearAIInsight = () => {
    setInsight("");
  };

  const { printSettings } = state;
  const waitingCount = state.tokens.filter(t => t.status === 'WAITING').length;
  const servedCount = state.tokens.filter(t => t.status === 'COMPLETED').length;

  const mockDate = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
  });

  const handleTestPrint = () => {
    const printArea = document.getElementById('test-print-preview');
    if (!printArea) return;

    // Create a clone to remove UI elements (like edit buttons/icons) before printing
    const printClone = printArea.cloneNode(true) as HTMLElement;
    printClone.querySelectorAll('[data-no-print]').forEach(el => el.remove());

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              @page { size: auto; margin: 0mm; }
              body { 
                margin: 0; 
                padding: 10mm; 
                font-family: 'Inter', -apple-system, sans-serif; 
                width: 80mm; 
                text-align: ${printSettings.textAlign};
                box-sizing: border-box;
              }
              h1, h2, h3, p { margin: 0; padding: 0; }
              .font-bold { font-weight: bold; }
              .font-black { font-weight: 900; }
              .uppercase { text-transform: uppercase; }
              .leading-none { line-height: 1; }
              .leading-tight { line-height: 1.2; }
              .font-serif { font-family: serif; }
              .font-mono { font-family: monospace; }
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .my-4 { margin-top: 16px; margin-bottom: 16px; }
              .border-dashed-b { border-bottom: 1px dashed #000; padding-bottom: 5mm; margin-bottom: 5mm; }
            </style>
          </head>
          <body>${printClone.innerHTML}</body>
        </html>
      `);
      doc.close();
      
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 500);
    }
  };

  const handleInlineEdit = (type: 'clinic' | 'clinicUrdu' | 'footer' | 'footerUrdu' | 'dept' | 'deptUrdu', value: string) => {
    if (type === 'clinic') updateClinicDetails(value, state.clinicNameUrdu);
    else if (type === 'clinicUrdu') updateClinicDetails(state.clinicName, value);
    else if (type === 'footer') updatePrintSettings({ footerText: value });
    else if (type === 'footerUrdu') updatePrintSettings({ footerTextUrdu: value });
    else if (type === 'dept') setMockDeptName(value);
    else if (type === 'deptUrdu') setMockDeptNameUrdu(value);
  };

  const ToggleOverlay = ({ active, onToggle, label }: { active: boolean, onToggle: () => void, label: string }) => (
    <div data-no-print className="absolute top-1 right-1 opacity-0 group-hover/section:opacity-100 transition-opacity z-20 flex gap-1">
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`p-1.5 rounded-md shadow-lg border transition-all ${active ? 'bg-white text-blue-600 border-blue-100' : 'bg-slate-800 text-white border-slate-700'}`}
        title={`Toggle ${label}`}
      >
        {active ? <Eye size={12} /> : <EyeOff size={12} />}
      </button>
    </div>
  );

  const handleAddGroup = () => {
      const newGroup: PatientGroup = {
          id: `grp_${Date.now()}`,
          name: 'New Group',
          nameUrdu: 'نیا گروپ',
          priority: 10,
          color: 'slate',
          icon: 'users',
          isActive: true
      };
      addPatientGroup(newGroup);
      setEditingGroupId(newGroup.id);
  };

  const displayEng = simulatedLang !== 'URDU';
  const displayUrdu = simulatedLang !== 'ENGLISH';

  return (
    <div className="h-full bg-slate-50 overflow-y-auto p-8 relative">
      
      {/* Reset Confirmation Overlay */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${showResetConfirm === 'factory' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                {showResetConfirm === 'factory' ? 'Factory Reset System?' : 'Start New Day?'}
              </h3>
              <p className="text-slate-500 mb-8 leading-relaxed">
                {showResetConfirm === 'factory' 
                  ? 'This will wipe ALL settings, departments, counters and history. This action cannot be undone.' 
                  : 'This will clear all current patients and restart the token sequence from 001. Current settings will be kept.'}
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                   onClick={showResetConfirm === 'factory' ? handleFactoryReset : handleDailyReset}
                   className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${showResetConfirm === 'factory' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                 >
                   Confirm Reset
                 </button>
                 <button 
                   onClick={() => setShowResetConfirm(null)}
                   className="w-full py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                 >
                   Cancel
                 </button>
              </div>
           </div>
        </div>
      )}

      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Administration</h1>
          <h2 className="text-2xl text-slate-500 font-serif mt-1">نظام کی انتظامیہ</h2>
          <p className="text-slate-400 text-sm mt-1">Configure your clinic flow, language preferences, and printing layout.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setShowResetConfirm('daily')} 
            className="flex items-center gap-3 text-amber-700 bg-amber-50 hover:bg-amber-100 px-5 py-3 rounded-xl transition-all border border-amber-100 shadow-sm"
          >
            <RefreshCcw size={18} /> 
            <div className="flex flex-col items-start text-xs">
                <span className="font-bold">Daily Reset</span>
                <span className="font-serif text-[10px] opacity-70">نیا دن شروع کریں</span>
            </div>
          </button>
          <button 
            onClick={() => setShowResetConfirm('factory')} 
            className="flex items-center gap-3 text-red-600 bg-red-50 hover:bg-red-100 px-5 py-3 rounded-xl transition-all border border-red-100 shadow-sm"
          >
            <Trash2 size={18} /> 
            <div className="flex flex-col items-start text-xs">
                <span className="font-bold">Factory Reset</span>
                <span className="font-serif text-[10px] opacity-70">سسٹم ری سیٹ</span>
            </div>
          </button>
        </div>
      </header>

      {/* Printer Setup Tip */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 mb-8 shadow-xl text-white">
         <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
               <Info size={24} />
            </div>
            <div className="flex-1">
               <h3 className="text-xl font-bold mb-1">Direct Silent Printing</h3>
               <p className="text-blue-100 text-sm mb-4">To enable instant printing without a browser dialog, modify your browser shortcut and add the following flag:</p>
               <div className="flex items-center gap-3">
                  <code className="bg-black/30 px-3 py-2 rounded-lg font-mono text-xs border border-white/10 flex-1">--kiosk-printing</code>
                  <a href="https://support.google.com/chrome/a/answer/1385049?hl=en" target="_blank" className="text-xs bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-all flex items-center gap-2">
                    Learn More <ExternalLink size={14} />
                  </a>
               </div>
            </div>
         </div>
      </div>

      {/* PATIENT GROUPS CONFIGURATION */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
          <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <Users size={24} />
                  </div>
                  <div>
                      <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider">Patient Categories & Priority</h3>
                      <p className="text-xs text-slate-400">Define groups like 'War Wounded' or 'Officers'. Lower priority number = higher urgency.</p>
                  </div>
              </div>
              <button onClick={handleAddGroup} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all">
                  <Plus size={16} /> Add Group
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.patientGroups.map(group => (
                  <div key={group.id} className={`p-4 rounded-2xl border-2 transition-all ${editingGroupId === group.id ? 'border-indigo-500 bg-indigo-50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      {editingGroupId === group.id ? (
                          <div className="space-y-3">
                              <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Name (English)</label>
                                  <input 
                                      value={group.name} 
                                      onChange={(e) => updatePatientGroup(group.id, { name: e.target.value })} 
                                      className="w-full text-sm font-bold p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-500"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-bold text-slate-500 uppercase">Name (Urdu)</label>
                                  <input 
                                      value={group.nameUrdu} 
                                      onChange={(e) => updatePatientGroup(group.id, { nameUrdu: e.target.value })} 
                                      className="w-full text-sm font-bold p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-500 text-right font-serif"
                                      dir="rtl"
                                  />
                              </div>
                              <div className="flex gap-2">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Priority (1=High)</label>
                                      <input 
                                          type="number"
                                          value={group.priority} 
                                          onChange={(e) => updatePatientGroup(group.id, { priority: parseInt(e.target.value) })} 
                                          className="w-full text-sm font-bold p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-500"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase">Color</label>
                                      <select 
                                          value={group.color} 
                                          onChange={(e) => updatePatientGroup(group.id, { color: e.target.value })} 
                                          className="w-full text-sm font-bold p-2 rounded border border-indigo-200 focus:outline-none focus:border-indigo-500"
                                      >
                                          {SUPPORTED_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => removePatientGroup(group.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                  <button onClick={() => setEditingGroupId(null)} className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-bold uppercase">Done</button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full bg-${group.color}-100 text-${group.color}-600 flex items-center justify-center font-bold text-lg`}>
                                      {group.priority}
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 leading-none">{group.name}</h4>
                                      <p className="font-serif text-slate-500 text-sm">{group.nameUrdu}</p>
                                  </div>
                              </div>
                              <button onClick={() => setEditingGroupId(group.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                  <Settings size={18} />
                              </button>
                          </div>
                      )}
                  </div>
              ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
             <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">Department Restrictions</h4>
             <p className="text-xs text-slate-500 mb-4">Click to toggle allowed patient groups for each department. Empty means all are allowed.</p>
             <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                 {state.departments.map(dept => (
                     <div key={dept.id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
                         <div className="w-32 shrink-0 font-bold text-slate-700 text-xs uppercase">{dept.name}</div>
                         <div className="flex flex-wrap gap-2">
                             {state.patientGroups.map(grp => {
                                 const isAllowed = !dept.allowedPatientGroups || dept.allowedPatientGroups.length === 0 || dept.allowedPatientGroups.includes(grp.id);
                                 return (
                                     <button 
                                         key={grp.id}
                                         onClick={() => {
                                            const current = dept.allowedPatientGroups || [];
                                            // If logic: if list empty, it implicitly means ALL. So to toggle one OFF, we must first populate with ALL others.
                                            let newAllowed: string[];
                                            
                                            if (current.length === 0) {
                                                // Currently all allowed. User clicked to toggle ONE. So we add all EXCEPT this one.
                                                newAllowed = state.patientGroups.filter(g => g.id !== grp.id).map(g => g.id);
                                            } else {
                                                if (current.includes(grp.id)) {
                                                    newAllowed = current.filter(id => id !== grp.id);
                                                } else {
                                                    newAllowed = [...current, grp.id];
                                                }
                                            }
                                            // If we ended up selecting ALL, clear the array to mean "ALL"
                                            if (newAllowed.length === state.patientGroups.length) newAllowed = [];

                                            updateDepartment(dept.id, { allowedPatientGroups: newAllowed });
                                         }}
                                         className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${isAllowed ? `bg-${grp.color}-100 border-${grp.color}-200 text-${grp.color}-700` : 'bg-slate-100 border-slate-200 text-slate-300 line-through'}`}
                                     >
                                         {grp.name}
                                     </button>
                                 );
                             })}
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      </div>

      {/* Token Designer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Printer size={24} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-wider">Visual Token Designer</h3>
                <p className="text-xs text-slate-400">Customize the receipt layout and content.</p>
              </div>
            </div>
            <button 
              onClick={handleTestPrint}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg hover:shadow-slate-400/30 active:scale-95"
            >
              <Printer size={16} /> Run Test Print
            </button>
          </div>
          
          <div className="space-y-8">
            {/* Simulation Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Global Alignment</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {(['left', 'center', 'right'] as const).map(align => (
                    <button
                      key={align}
                      onClick={() => updatePrintSettings({ textAlign: align })}
                      className={`flex-1 py-2.5 rounded-xl flex justify-center transition-all ${printSettings.textAlign === align ? 'bg-white shadow-md text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {align === 'left' && <AlignLeft size={20} />}
                      {align === 'center' && <AlignCenter size={20} />}
                      {align === 'right' && <AlignRight size={20} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Preview Lang Preference</label>
                <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                  {(['ENGLISH', 'URDU', 'BOTH'] as SystemLanguage[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setSimulatedLang(lang)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold tracking-tight transition-all ${simulatedLang === lang ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Layout Controls */}
            <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                 <Settings size={14} /> Font Size (Pixels)
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600">Clinic Heading</label><span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{printSettings.clinicNameSize}px</span></div>
                    <input type="range" min="10" max="40" value={printSettings.clinicNameSize} onChange={(e) => updatePrintSettings({ clinicNameSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600">Department Name</label><span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{printSettings.deptNameSize}px</span></div>
                    <input type="range" min="12" max="60" value={printSettings.deptNameSize} onChange={(e) => updatePrintSettings({ deptNameSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600">Token Number</label><span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{printSettings.tokenNumberSize}px</span></div>
                    <input type="range" min="30" max="150" value={printSettings.tokenNumberSize} onChange={(e) => updatePrintSettings({ tokenNumberSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-600">Instructions (Footer)</label><span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{printSettings.footerSize}px</span></div>
                    <input type="range" min="8" max="24" value={printSettings.footerSize} onChange={(e) => updatePrintSettings({ footerSize: parseInt(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 sticky top-8 self-start">
           <div className="bg-slate-200/50 p-8 rounded-[40px] flex flex-col items-center justify-center border border-slate-200">
              <div 
                id="test-print-preview"
                className="bg-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] p-8 w-[320px] border border-slate-300 relative transition-all duration-300 group/receipt"
                style={{ textAlign: printSettings.textAlign }}
              >
                 <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-300 opacity-20" />
                 
                 {/* Clinic Header Section */}
                 <div className="mb-6 relative group/section border border-transparent hover:border-dashed hover:border-slate-300 p-2 rounded-xl transition-colors">
                   {displayEng && (
                     <div 
                       contentEditable 
                       suppressContentEditableWarning
                       onBlur={(e) => handleInlineEdit('clinic', e.currentTarget.textContent || '')}
                       style={{ fontSize: `${printSettings.clinicNameSize}px` }} 
                       className="font-black text-slate-900 leading-tight outline-none focus:bg-blue-50/50 px-1 cursor-text"
                     >
                       {state.clinicName}
                     </div>
                   )}
                   {displayUrdu && (
                     <div 
                       contentEditable 
                       suppressContentEditableWarning
                       onBlur={(e) => handleInlineEdit('clinicUrdu', e.currentTarget.textContent || '')}
                       style={{ fontSize: `${printSettings.clinicNameSize * 0.95}px` }} 
                       className="font-serif text-slate-600 mt-2 outline-none focus:bg-blue-50/50 px-1 cursor-text"
                     >
                       {state.clinicNameUrdu}
                     </div>
                   )}
                   <div data-no-print className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/section:opacity-40 text-slate-400 transition-opacity">
                      <Edit3 size={16} />
                   </div>
                 </div>

                 {/* Date Section */}
                 <div className={`relative group/section transition-opacity duration-300 ${printSettings.showDate ? 'opacity-100' : 'opacity-20'}`}>
                    <ToggleOverlay active={printSettings.showDate} onToggle={() => updatePrintSettings({ showDate: !printSettings.showDate })} label="Date" />
                    <p style={{ fontSize: `${printSettings.dateSize}px` }} className="text-slate-400 font-mono mb-6 border-b border-dashed border-slate-200 pb-3">
                       {mockDate}
                    </p>
                 </div>

                 {/* Department Section */}
                 <div className={`py-6 border-b border-slate-200 mb-6 relative group/section transition-opacity duration-300 ${printSettings.showDepartment ? 'opacity-100' : 'opacity-20'}`}>
                   <ToggleOverlay active={printSettings.showDepartment} onToggle={() => updatePrintSettings({ showDepartment: !printSettings.showDepartment })} label="Department" />
                   {displayEng && (
                      <p 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineEdit('dept', e.currentTarget.textContent || '')}
                        style={{ fontSize: `${printSettings.deptNameSize}px` }} 
                        className="font-black uppercase text-slate-800 leading-none mb-2 outline-none cursor-text"
                      >
                        {mockDeptName}
                      </p>
                   )}
                   {displayUrdu && (
                      <p 
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleInlineEdit('deptUrdu', e.currentTarget.textContent || '')}
                        style={{ fontSize: `${printSettings.deptNameSize}px` }} 
                        className="font-serif text-slate-700 leading-none outline-none cursor-text"
                      >
                        {mockDeptNameUrdu}
                      </p>
                   )}
                 </div>

                 {/* Token Number */}
                 <div className="relative group/section py-4">
                   <h2 style={{ fontSize: `${printSettings.tokenNumberSize}px` }} className="font-black text-slate-900 leading-none tracking-tighter drop-shadow-sm">M-001</h2>
                 </div>

                 {/* Patient Group & Gender Badge */}
                 <div className="space-y-4 mb-8 mt-4">
                     <div className={`relative group/section transition-opacity duration-300 ${printSettings.showPatientGroup ? 'opacity-100' : 'opacity-20'}`}>
                        <ToggleOverlay active={printSettings.showPatientGroup !== false} onToggle={() => updatePrintSettings({ showPatientGroup: !printSettings.showPatientGroup })} label="Patient Group" />
                        <div className="font-bold uppercase text-slate-700">OFFICER / گزیٹڈ</div>
                     </div>

                     <div className={`relative group/section transition-opacity duration-300 ${printSettings.showGender ? 'opacity-100' : 'opacity-20'}`}>
                        <ToggleOverlay active={printSettings.showGender} onToggle={() => updatePrintSettings({ showGender: !printSettings.showGender })} label="Gender" />
                        <div className="inline-flex items-center gap-3 px-5 py-2 bg-slate-100 rounded-2xl font-bold text-[11px] uppercase text-slate-600 shadow-sm">
                        Male / مرد
                        </div>
                     </div>
                 </div>

                 {/* Footer Section */}
                 <div className="space-y-2 relative group/section border border-transparent hover:border-dashed hover:border-slate-300 p-2 rounded-xl transition-colors">
                   {displayEng && (
                     <div 
                       contentEditable 
                       suppressContentEditableWarning
                       onBlur={(e) => handleInlineEdit('footer', e.currentTarget.textContent || '')}
                       style={{ fontSize: `${printSettings.footerSize}px` }} 
                       className="text-slate-500 leading-tight outline-none focus:bg-blue-50/50 px-1 cursor-text"
                     >
                       {printSettings.footerText}
                     </div>
                   )}
                   {displayUrdu && (
                     <div 
                       contentEditable 
                       suppressContentEditableWarning
                       onBlur={(e) => handleInlineEdit('footerUrdu', e.currentTarget.textContent || '')}
                       style={{ fontSize: `${printSettings.footerSize * 1.3}px` }} 
                       className="font-serif text-slate-500 leading-tight outline-none focus:bg-blue-50/50 px-1 cursor-text"
                     >
                       {printSettings.footerTextUrdu}
                     </div>
                   )}
                   <div data-no-print className="absolute -left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover/section:opacity-40 text-slate-400 transition-opacity">
                      <Edit3 size={16} />
                   </div>
                 </div>

                 <div className="mt-12 pt-6 border-t border-dashed border-slate-300 flex justify-center opacity-30">
                    <div className="flex flex-col gap-2 items-center">
                       <div className="w-40 h-2.5 bg-slate-900 rounded-full" />
                       <div className="w-24 h-2.5 bg-slate-900 rounded-full" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Language Preference Section */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
               <Globe size={20} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-wider text-sm">System Language Master</h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {(['ENGLISH', 'URDU', 'BOTH'] as SystemLanguage[]).map(lang => (
               <button
                 key={lang}
                 onClick={() => updateSystemLanguage(lang)}
                 className={`
                   p-6 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all group
                   ${state.systemLanguage === lang 
                     ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-xl shadow-blue-100' 
                     : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-blue-200'}
                 `}
               >
                 <span className={`font-black text-xs tracking-widest mb-1 ${state.systemLanguage === lang ? 'text-blue-600' : ''}`}>{lang === 'BOTH' ? 'BILINGUAL' : `${lang} ONLY`}</span>
                 <span className="font-serif text-lg opacity-80">
                   {lang === 'ENGLISH' ? 'صرف انگریزی' : lang === 'URDU' ? 'صرف اردو' : 'دونوں زبانیں'}
                 </span>
               </button>
             ))}
         </div>
      </div>
    </div>
  );
};
