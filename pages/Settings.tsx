
import React, { useState, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { 
  Printer, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff,
  Globe, Settings, Trash2, RefreshCcw, AlertTriangle, Info, Edit3, ExternalLink,
  Save, Layout, Type, Palette, Building, History,
  Zap, ArrowDownUp, ToggleLeft, ToggleRight, MonitorPlay,
  Users, Plus, Shield, Cpu, Layers, Mic, CheckCircle, Upload, Wifi
} from '../components/Icons';
import * as Icons from '../components/Icons';
import { SystemLanguage, DisplayMode, PatientGroup } from '../types';

const SUPPORTED_COLORS = [
  'slate', 'red', 'orange', 'amber', 'yellow', 'lime', 
  'green', 'emerald', 'teal', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
  'pink', 'rose'
];

const GROUP_ICONS = [
  'star', 'medal', 'shield', 'accessibility', 'users', 
  'heart-pulse', 'baby', 'clock', 'crown', 'activity'
];

const renderIcon = (iconKey: string | undefined, size: number, className?: string) => {
  const IconComponent = (Icons as any)[iconKey === 'clock' ? 'Clock' : iconKey === 'crown' ? 'Crown' : iconKey === 'star' ? 'Star' : iconKey === 'medal' ? 'Medal' : iconKey === 'shield' ? 'Shield' : iconKey === 'accessibility' ? 'Accessibility' : iconKey === 'users' ? 'Users' : iconKey === 'heart-pulse' ? 'HeartPulse' : iconKey === 'baby' ? 'Baby' : 'Activity'] || Icons.Activity;
  return <IconComponent size={size} className={className} />;
};

export const SettingsPage: React.FC = () => {
  const { 
    state, clearTokens, factoryReset, updateSystemLanguage, updatePrintSettings, 
    updateClinicDetails, updateDisplayMode, toggleShowRoomNumber,
    addPatientGroup, updatePatientGroup, removePatientGroup, updateDepartment,
    seedDatabase, clearUserData, resetDepartments, resetClinicSettings, updateAnnouncementVoice, updateAudioSource,
    forceSync
  } = useQueue();
  
  const [showResetConfirm, setShowResetConfirm] = useState<'daily' | 'factory' | 'seed' | 'clear' | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  
  const [mockDeptName, setMockDeptName] = useState("Officer Clinic");
  const [mockDeptNameUrdu, setMockDeptNameUrdu] = useState("آفیسر کلینک");
  const [simulatedLang, setSimulatedLang] = useState<SystemLanguage>(state.systemLanguage);
  
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoLaunchSecondary, setAutoLaunchSecondary] = useState(false);

  useEffect(() => {
    // Load local storage setting for dual screen
    const saved = localStorage.getItem('zenqueue_dual_screen');
    if (saved === 'true') setAutoLaunchSecondary(true);

    const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const filtered = voices.filter(v => {
            const lang = v.lang.toLowerCase();
            return lang.includes('ur') || lang.includes('en');
        });
        const sorted = filtered.sort((a, b) => {
            const aScore = a.lang.toLowerCase().includes('ur') ? 2 : 1;
            const bScore = b.lang.toLowerCase().includes('ur') ? 2 : 1;
            return bScore - aScore;
        });
        setAvailableVoices(sorted);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const handleForceSync = () => {
      forceSync();
      setSynced(true);
      setTimeout(() => setSynced(false), 2000);
  };

  const toggleAutoLaunch = () => {
      const newVal = !autoLaunchSecondary;
      setAutoLaunchSecondary(newVal);
      localStorage.setItem('zenqueue_dual_screen', String(newVal));
  };

  const handleVoiceTest = (voiceURI: string) => {
    window.speechSynthesis.cancel();
    let voice = availableVoices.find(v => v.voiceURI === voiceURI);
    if (!voice) {
        const allVoices = window.speechSynthesis.getVoices();
        voice = allVoices.find(v => v.voiceURI === voiceURI);
    }
    if (voice) {
        const text = "ٹوکن نمبر 105، کاؤنٹر نمبر 1 پر تشریف لائیں";
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.rate = 0.85; 
        u.pitch = 0.9;
        window.speechSynthesis.speak(u);
    }
  };

  const { printSettings } = state;

  const handleTestPrint = () => {
    const printArea = document.getElementById('test-print-preview');
    if (!printArea) return;
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
              body { margin: 0; padding: 5mm; font-family: sans-serif; text-align: ${printSettings.textAlign}; }
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
              .border-dashed-b { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            </style>
          </head>
          <body>${printClone.innerHTML}</body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 500);
    }
  };

  const handleInlineEdit = (type: string, value: string) => {
    if (type === 'clinic') updateClinicDetails(value, state.clinicNameUrdu);
    else if (type === 'clinicUrdu') updateClinicDetails(state.clinicName, value);
    else if (type === 'footer') updatePrintSettings({ footerText: value });
    else if (type === 'footerUrdu') updatePrintSettings({ footerTextUrdu: value });
    else if (type === 'dept') setMockDeptName(value);
    else if (type === 'deptUrdu') setMockDeptNameUrdu(value);
  };

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

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>, groupId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024) { // 100KB limit
          alert("Icon file is too large. Please use an SVG or Image under 100KB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        updatePatientGroup(groupId, { customIcon: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const displayEng = simulatedLang !== 'URDU';
  const displayUrdu = simulatedLang !== 'ENGLISH';

  const ToggleSwitch = ({ label, active, onToggle }: { label: string, active: boolean, onToggle: () => void }) => (
    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
      <button 
        onClick={onToggle}
        className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${active ? 'bg-blue-600' : 'bg-slate-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${active ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div className="h-full bg-[#f8fafc] overflow-y-auto p-6 md:p-10 relative">
      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl max-w-md w-full p-10 animate-in zoom-in-95 duration-200 border border-slate-100">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 ${showResetConfirm === 'factory' || showResetConfirm === 'clear' ? 'bg-red-50 text-red-600 shadow-xl shadow-red-100' : 'bg-amber-50 text-amber-600 shadow-xl shadow-amber-100'}`}>
                 <AlertTriangle size={40} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 mb-2 leading-none">
                {showResetConfirm === 'factory' ? 'Wipe Entire System?' : 
                 showResetConfirm === 'clear' ? 'Clear User Data?' :
                 showResetConfirm === 'seed' ? 'Seed Demo Data?' :
                 'Restart Daily Sequence?'}
              </h3>
              <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                {showResetConfirm === 'factory' 
                  ? 'This will clear ALL tokens, departments, counters, and restore default branding. This cannot be undone.' 
                  : showResetConfirm === 'clear' 
                  ? 'This will remove ALL tokens, departments, and counters. You will be left with an empty system. Settings will remain.'
                  : showResetConfirm === 'seed'
                  ? 'This will overwrite current data with demonstration data (tokens, departments, counters). Existing data may be lost.'
                  : 'This clears all current patients and restarts the token counter from 001. Your configuration is safe.'}
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                    onClick={() => {
                        if (showResetConfirm === 'factory') factoryReset();
                        else if (showResetConfirm === 'daily') clearTokens();
                        else if (showResetConfirm === 'seed') seedDatabase();
                        else if (showResetConfirm === 'clear') clearUserData();
                        setShowResetConfirm(null);
                    }} 
                    className={`w-full py-5 rounded-2xl font-black text-white shadow-xl transition-transform active:scale-95 uppercase tracking-widest text-xs ${showResetConfirm === 'factory' || showResetConfirm === 'clear' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'}`}
                 >
                   Confirm Action
                 </button>
                 <button onClick={() => setShowResetConfirm(null)} className="w-full py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">
                   Cancel and Return
                 </button>
              </div>
           </div>
        </div>
      )}

      <header className="mb-10 flex justify-between items-start">
        <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">System Configuration</h1>
            <p className="text-slate-500 font-medium mt-1">Branding, localization, hardware integration, and data maintenance.</p>
        </div>
        <button 
            onClick={handleForceSync}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all shadow-sm ${synced ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
            <div className={`p-1 rounded-full ${synced ? 'bg-emerald-200' : 'bg-slate-200'}`}>
                <Wifi size={16} className={synced ? 'text-emerald-700' : 'text-slate-500'} />
            </div>
            <div className="text-left">
                <span className="block text-[10px] font-black uppercase tracking-wider">{synced ? 'SYNCED!' : 'NETWORK SYNC'}</span>
                <span className="block text-xs font-bold">{synced ? 'Data Pushed' : 'Push Local Data'}</span>
            </div>
        </button>
      </header>

      {/* Device Specific Settings */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-teal-50 text-teal-600 rounded-3xl shadow-sm"><MonitorPlay size={24} /></div>
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">Device Specifics (Local)</h3>
              <p className="text-xs font-bold text-slate-400">Settings applied only to this specific browser/device.</p>
            </div>
         </div>
         
         <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex items-center justify-between">
            <div>
               <h4 className="font-bold text-slate-900 text-sm mb-1">Auto-Launch Secondary Display</h4>
               <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                  Automatically opens the relevant display screen (Waiting Hall for Reception, Room Screen for Counters) on the secondary monitor when the app starts.
                  <br/><span className="text-amber-600 font-bold">Note: Requires popup permission.</span>
               </p>
            </div>
            <ToggleSwitch label={autoLaunchSecondary ? 'ENABLED' : 'DISABLED'} active={autoLaunchSecondary} onToggle={toggleAutoLaunch} />
         </div>
      </div>

      {/* Patient Categories & Priority */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-sm"><Users size={24} /></div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">Patient Categories</h3>
                  <p className="text-xs font-bold text-slate-400">Manage patient types, queuing priority (1 = Highest), and display icons.</p>
                </div>
            </div>
            <button onClick={handleAddGroup} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                <Plus size={16} /> Add Category
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {state.patientGroups.sort((a,b) => a.priority - b.priority).map(group => (
                 <div key={group.id} className={`p-4 rounded-[1.5rem] border-2 transition-all ${editingGroupId === group.id ? 'border-indigo-500 bg-indigo-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      {editingGroupId === group.id ? (
                          <div className="space-y-3">
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Category Name (English)</label>
                                  <input 
                                      value={group.name} 
                                      onChange={(e) => updatePatientGroup(group.id, { name: e.target.value })} 
                                      className="w-full text-sm font-bold p-2 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-500"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Category Name (Urdu)</label>
                                  <input 
                                      value={group.nameUrdu} 
                                      onChange={(e) => updatePatientGroup(group.id, { nameUrdu: e.target.value })} 
                                      className="w-full text-sm font-bold p-2 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-500 text-right font-serif"
                                      dir="rtl"
                                  />
                              </div>
                              <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Display Icon</label>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                      {GROUP_ICONS.map(iconKey => (
                                          <button
                                              key={iconKey}
                                              onClick={() => updatePatientGroup(group.id, { icon: iconKey, customIcon: undefined })}
                                              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${group.icon === iconKey && !group.customIcon ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                              title={iconKey}
                                          >
                                              {renderIcon(iconKey, 16)}
                                          </button>
                                      ))}
                                  </div>
                                  
                                  <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                                      {group.customIcon ? (
                                          <div className="relative group/icon shrink-0">
                                              <img src={group.customIcon} alt="Custom" className="w-8 h-8 object-contain rounded-md bg-white border border-indigo-200" />
                                              <button 
                                                onClick={() => updatePatientGroup(group.id, { customIcon: undefined })} 
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/icon:opacity-100 transition-opacity"
                                              >
                                                <Icons.XCircle size={10} />
                                              </button>
                                          </div>
                                      ) : (
                                          <div className="w-8 h-8 rounded-md bg-white border-2 border-dashed border-indigo-200 flex items-center justify-center text-indigo-300">
                                              <Upload size={14} />
                                          </div>
                                      )}
                                      <label className="flex-1 cursor-pointer">
                                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide hover:underline">Upload Custom SVG</span>
                                          <input type="file" className="hidden" accept=".svg,image/svg+xml,image/png" onChange={(e) => handleIconUpload(e, group.id)} />
                                      </label>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <div className="flex-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Priority</label>
                                      <input 
                                          type="number"
                                          value={group.priority} 
                                          onChange={(e) => updatePatientGroup(group.id, { priority: parseInt(e.target.value) })} 
                                          className="w-full text-sm font-bold p-2 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-500"
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Color</label>
                                      <select 
                                          value={group.color} 
                                          onChange={(e) => updatePatientGroup(group.id, { color: e.target.value })} 
                                          className="w-full text-sm font-bold p-2 rounded-xl border border-indigo-200 focus:outline-none focus:border-indigo-500 bg-white"
                                      >
                                          {SUPPORTED_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                                      </select>
                                  </div>
                              </div>
                              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-indigo-100">
                                  <button onClick={() => removePatientGroup(group.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                  <button onClick={() => setEditingGroupId(null)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-indigo-700 transition-colors">Done</button>
                              </div>
                          </div>
                      ) : (
                          <div className="flex justify-between items-center h-full">
                              <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl bg-${group.color}-100 text-${group.color}-600 flex items-center justify-center font-black text-xl shadow-sm border border-${group.color}-200 relative`}>
                                      {group.priority}
                                      <div className={`absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-${group.color}-100 text-${group.color}-500 overflow-hidden w-6 h-6 flex items-center justify-center`}>
                                          {group.customIcon ? (
                                              <img src={group.customIcon} className="w-full h-full object-contain" />
                                          ) : (
                                              renderIcon(group.icon, 12)
                                          )}
                                      </div>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-slate-800 leading-tight">{group.name}</h4>
                                      <p className="font-serif text-slate-500 text-sm mt-0.5">{group.nameUrdu}</p>
                                  </div>
                              </div>
                              <button onClick={() => setEditingGroupId(group.id)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">
                                  <Settings size={20} />
                              </button>
                          </div>
                      )}
                 </div>
             ))}
         </div>

         {/* Department Restrictions */}
         <div className="mt-8 pt-8 border-t border-slate-100">
             <div className="flex items-center gap-2 mb-4">
                <Layers size={18} className="text-slate-400" />
                <h4 className="font-black text-slate-700 text-sm uppercase tracking-wider">Department Restrictions</h4>
             </div>
             <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100 inline-block">
                Click groups to toggle their availability for each department. <br/>
                <strong className="text-slate-700">Empty selection = All groups allowed.</strong>
             </p>
             <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                 {state.departments.map(dept => (
                     <div key={dept.id} className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div className="w-48 shrink-0 flex items-center gap-3">
                             <div className={`w-2 h-10 rounded-full bg-${dept.color}-500`} />
                             <div>
                                <span className="font-bold text-slate-700 text-sm uppercase block">{dept.name}</span>
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{dept.prefix}</span>
                             </div>
                         </div>
                         <div className="flex flex-wrap gap-2 flex-1">
                             {state.patientGroups.map(grp => {
                                 const isAllowed = !dept.allowedPatientGroups || dept.allowedPatientGroups.length === 0 || dept.allowedPatientGroups.includes(grp.id);
                                 return (
                                     <button 
                                         key={grp.id}
                                         onClick={() => {
                                            const current = dept.allowedPatientGroups || [];
                                            let newAllowed: string[];
                                            
                                            if (current.length === 0) {
                                                // Currently all allowed (empty). User clicked to disable ONE.
                                                // So we must explicitly enable ALL OTHERS except this one.
                                                newAllowed = state.patientGroups.filter(g => g.id !== grp.id).map(g => g.id);
                                            } else {
                                                if (current.includes(grp.id)) {
                                                    newAllowed = current.filter(id => id !== grp.id);
                                                } else {
                                                    newAllowed = [...current, grp.id];
                                                }
                                            }
                                            // If we ended up selecting ALL (length match), clear array to denote "ALL"
                                            if (newAllowed.length === state.patientGroups.length) newAllowed = [];

                                            updateDepartment(dept.id, { allowedPatientGroups: newAllowed });
                                         }}
                                         className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-2 ${isAllowed ? `bg-${grp.color}-100 border-${grp.color}-200 text-${grp.color}-700 shadow-sm` : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'}`}
                                     >
                                         {isAllowed && <CheckCircle size={10} />}
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

      {/* Audio Engine Configuration */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl shadow-sm"><Mic size={24} /></div>
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">Audio Engine</h3>
              <p className="text-xs font-bold text-slate-400">Choose between standard TTS or premium server-side audio files.</p>
            </div>
         </div>
         
         <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                    onClick={() => updateAudioSource('BROWSER_TTS')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${state.audioSource !== 'SERVER_FILE' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                 >
                    <span className="block font-black text-sm uppercase tracking-wide mb-1">Standard TTS</span>
                    <span className="text-xs opacity-70">Uses browser built-in voices. Good for dynamic text. No setup required.</span>
                 </button>
                 <button 
                    onClick={() => updateAudioSource('SERVER_FILE')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${state.audioSource === 'SERVER_FILE' ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                 >
                    <span className="block font-black text-sm uppercase tracking-wide mb-1">Server Files (Premium)</span>
                    <span className="text-xs opacity-70">Uses high-quality pre-generated files from server. Requires 'voice_assets' folder setup.</span>
                 </button>
             </div>

             {state.audioSource !== 'SERVER_FILE' ? (
                 <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Preferred System Voice</label>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <select 
                                value={state.announcementVoiceURI || ''} 
                                onChange={(e) => {
                                    updateAnnouncementVoice(e.target.value);
                                    handleVoiceTest(e.target.value);
                                }}
                                className="w-full p-4 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-none focus:border-indigo-500 appearance-none"
                            >
                                <option value="">Default System Voice</option>
                                {availableVoices.map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI}>
                                        {v.name} ({v.lang}) {v.localService ? '[Offline]' : '[Network]'}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <ArrowDownUp size={16} />
                            </div>
                        </div>
                        <button 
                            onClick={() => state.announcementVoiceURI && handleVoiceTest(state.announcementVoiceURI)}
                            className="bg-indigo-600 text-white px-6 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Test
                        </button>
                    </div>
                 </div>
             ) : (
                 <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <Info size={20} className="text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm mb-1">Server File Setup Required</h4>
                            <p className="text-xs text-indigo-700/80 leading-relaxed mb-3">
                                Ensure the <code>voice_assets</code> folder exists on the server with the following structure:
                            </p>
                            <ul className="text-xs text-indigo-600 font-mono space-y-1 bg-white/50 p-3 rounded-lg border border-indigo-100/50">
                                <li>/voice_assets/ur_token.mp3</li>
                                <li>/voice_assets/ur_counter.mp3</li>
                                <li>/voice_assets/numbers/1.mp3 ... 100.mp3</li>
                            </ul>
                        </div>
                    </div>
                 </div>
             )}
         </div>
      </div>

      {/* ... Data Management Section ... */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-rose-50 text-rose-600 rounded-3xl shadow-sm"><Shield size={24} /></div>
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">Data Management & Maintenance</h3>
              <p className="text-xs font-bold text-slate-400">Manage system data, resets, and manual overrides.</p>
            </div>
         </div>
         
         <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0"><RefreshCcw size={20} /></div>
                <div>
                    <h4 className="font-bold text-blue-900 mb-1">Automated Daily Reset Active</h4>
                    <p className="text-xs text-blue-700/80 leading-relaxed">
                        The system automatically clears all tokens and resets counters at the start of each new day (00:00). No manual action is required for daily operations.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                    onClick={() => setShowResetConfirm('seed')}
                    className="p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600 transition-all group flex flex-col items-center justify-center gap-3"
                >
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><RefreshCcw size={24} /></div>
                    <div className="text-center">
                        <span className="font-black text-xs uppercase tracking-widest block mb-1">Seed Demo Data</span>
                        <span className="text-[10px] opacity-70">Load sample departments & tokens</span>
                    </div>
                </button>
                
                <button 
                    onClick={() => setShowResetConfirm('clear')}
                    className="p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 text-slate-500 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-all group flex flex-col items-center justify-center gap-3"
                >
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Trash2 size={24} /></div>
                    <div className="text-center">
                        <span className="font-black text-xs uppercase tracking-widest block mb-1">Clear User Data</span>
                        <span className="text-[10px] opacity-70">Wipe all data for fresh setup</span>
                    </div>
                </button>

                <button 
                    onClick={() => setShowResetConfirm('factory')}
                    className="p-6 rounded-[2rem] border-2 border-slate-100 bg-slate-50 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all group flex flex-col items-center justify-center gap-3"
                >
                    <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><AlertTriangle size={24} /></div>
                    <div className="text-center">
                        <span className="font-black text-xs uppercase tracking-widest block mb-1">System Restore</span>
                        <span className="text-[10px] opacity-70">Factory reset all settings</span>
                    </div>
                </button>
            </div>

            <div className="pt-6 border-t border-slate-100">
                <h4 className="font-black text-slate-700 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Settings size={16} /> Manual Overrides
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => setShowResetConfirm('daily')} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all">
                        <RefreshCcw size={16} />
                        <span className="font-bold text-xs">Reset Tokens Only</span>
                    </button>
                    <button onClick={() => { if(window.confirm('Reset Departments to Default? This will remove custom departments.')) resetDepartments(); }} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all">
                        <Layers size={16} />
                        <span className="font-bold text-xs">Reset Departments Only</span>
                    </button>
                    <button onClick={() => { if(window.confirm('Reset Clinic Info to Default?')) resetClinicSettings(); }} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all">
                        <Building size={16} />
                        <span className="font-bold text-xs">Reset Clinic Info</span>
                    </button>
                </div>
            </div>
         </div>
      </div>

      {/* System Language Configuration */}
      <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
         <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl shadow-sm"><Globe size={24} /></div>
            <div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-wider">System Language</h3>
              <p className="text-xs font-bold text-slate-400">Global language preference for Kiosk and Displays</p>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             {(['ENGLISH', 'URDU', 'BOTH'] as SystemLanguage[]).map(lang => (
               <button
                 key={lang}
                 onClick={() => updateSystemLanguage(lang)}
                 className={`
                   p-6 rounded-[2rem] border-2 flex flex-col items-center justify-center transition-all group relative overflow-hidden
                   ${state.systemLanguage === lang 
                     ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-xl shadow-blue-100' 
                     : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-blue-200 hover:shadow-md'}
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
