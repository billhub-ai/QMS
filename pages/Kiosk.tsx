
import React, { useState, useRef, useEffect } from 'react';
import { useQueue } from '../context/QueueContext';
import { Department, Gender, Token, PatientGroup, TokenStatus } from '../types';
import * as Icons from '../components/Icons';
import { translateToUrdu } from '../services/geminiService';

const SUPPORTED_COLORS = [
  'slate', 'red', 'orange', 'amber', 'lime', 
  'emerald', 'teal', 'cyan', 'blue', 'violet', 
  'fuchsia', 'rose'
];

// Darkened border-300 for visibility, hover border-500 for interaction
const getColorClass = (color: string) => `bg-${color}-50 border-${color}-300 text-${color}-900 hover:border-${color}-500`;

const ICON_MAP: Record<string, any> = {
  'ct': Icons.CTIcon,
  'mri': Icons.MRIIcon,
  'ultrasound': Icons.UltrasoundIcon,
  'fetus': Icons.FetusIcon,
  'mammography': Icons.MammographyIcon,
  'breast': Icons.BreastIcon,
  'radiology': Icons.Radiation,
  'scan': Icons.Scan,
  'stethoscope': Icons.Stethoscope,
  'users': Icons.Users,
  'file-text': Icons.FileText,
  'heart-pulse': Icons.HeartPulse,
  'baby': Icons.Baby,
  'eye': Icons.Eye,
  'bone': Icons.Bone,
  'pill': Icons.Pill,
  'syringe': Icons.Syringe,
  'thermometer': Icons.Thermometer,
  'brain': Icons.BrainCircuit,
  'accessibility': Icons.Accessibility,
  'medical': Icons.BriefcaseMedical,
  'scissors': Icons.Scissors,
  'ear': Icons.Ear,
  'microscope': Icons.Microscope,
  'test-tube': Icons.TestTube,
  'smile': Icons.Smile,
  'droplet': Icons.Droplet,
  'siren': Icons.Siren,
  'star': Icons.Star,
  'shield': Icons.Shield,
  'check-circle': Icons.CheckCircle,
  'user': Icons.Users,
  'medal': Icons.Medal,
  'crown': Icons.Crown,
  'award': Icons.Medal,
  'user-plus': Icons.UserPlus,
  'user-check': Icons.CheckCircle,
  'activity': Icons.Activity
};

const AVAILABLE_ICON_KEYS = Object.keys(ICON_MAP);

const MedicalSnakeIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3V21" /><path d="M10 6C10 4 11 3 12 3C14 3 15 4 15 6C15 9 9 10 9 13C9 16 14 17 14 19C14 20.5 13 21 12 21" /><path d="M10 6C10 6.5 10.5 7 11 7" opacity="0.5"/>
  </svg>
);

const DateDisplay = ({ date }: { date: Date }) => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const dayStr = String(day).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'long' });
  const year = date.getFullYear();
  const getOrdinalSuffix = (n: number) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };
  return (
    <div className="flex items-center gap-2 md:gap-4 justify-center">
      <Icons.Calendar className="text-slate-400 shrink-0 w-4 h-4 md:w-[2cqi] md:h-[2cqi]" />
      <span className="whitespace-nowrap font-semibold text-slate-600" style={{ fontSize: 'clamp(0.8rem, 3cqi, 1.8rem)' }}>
        {weekday}, {dayStr}<sup style={{ fontSize: '0.6em', verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{getOrdinalSuffix(day)}</sup> {month}, {year}.
      </span>
    </div>
  );
};

export const Kiosk: React.FC = () => {
  const { state, addToken, isEditMode, setIsEditMode, setDeviceRole, updateDepartment, addDepartment, removeDepartment, updateKioskImage, updateClinicLogo, updateKioskImageSettings, updateClinicDetails, updateKioskBranding } = useQueue();
  
  // Selection States
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PatientGroup | null>(null);
  const [lastToken, setLastToken] = useState<Token | null>(null);
  
  // UI States
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const longPressTimer = useRef<number | null>(null);
  const handleTouchStart = () => {
    longPressTimer.current = window.setTimeout(() => {
      setIsEditMode(!isEditMode);
      if (window.navigator.vibrate) window.navigator.vibrate(50);
    }, 2000);
  };
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Safe defaults if settings are missing
  const { widthPercent = 100, verticalAlign = 'center', horizontalAlign = 'center' } = state.kioskImageSettings || { widthPercent: 100, verticalAlign: 'center', horizontalAlign: 'center' };
  
  const { printSettings } = state;
  const showEngGlobal = state.systemLanguage !== 'URDU';
  const showUrduGlobal = state.systemLanguage !== 'ENGLISH';
  const randomDefaultImage = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDeptSelect = (dept: Department) => {
    if (isEditMode) return;
    setSelectedDept(dept);
  };

  const handleGroupSelect = (group: PatientGroup) => {
    setSelectedGroup(group);
    if (!selectedDept?.isGenderSeparated) {
        generateToken(selectedDept!.id, Gender.NONE, group.id);
    }
  };

  const resetSelection = () => {
      setSelectedDept(null);
      setSelectedGroup(null);
  };

  const cycleIcon = (dept: Department) => {
    // If custom icon exists, do nothing (user can remove it via upload) or clear it
    if (dept.customIcon) return;
    const currentIndex = AVAILABLE_ICON_KEYS.indexOf(dept.icon || 'stethoscope');
    const nextIndex = (currentIndex + 1) % AVAILABLE_ICON_KEYS.length;
    updateDepartment(dept.id, { icon: AVAILABLE_ICON_KEYS[nextIndex] });
  };

  const handleAddCategory = () => {
    const newId = `dept_${Date.now()}`;
    const randomColor = SUPPORTED_COLORS[Math.floor(Math.random() * SUPPORTED_COLORS.length)];
    addDepartment({
      id: newId, name: "New Service", nameUrdu: "نئی سروس", prefix: "NEW",
      isGenderSeparated: false, hasSeparateGenderTokenSequences: false,
      showGenderPrefix: true, showDeptPrefix: false, color: randomColor, icon: "medical",
      showEnglish: true, showUrdu: true, isActive: true
    });
  };

  const getNextTicket = (deptId: string, gender: Gender = Gender.NONE) => {
    const dept = state.departments.find(d => d.id === deptId);
    if (!dept) return "001";
    let countingScope = state.tokens.filter(t => t.departmentId === deptId);
    const useSeparateSequence = dept.isGenderSeparated && dept.hasSeparateGenderTokenSequences && gender !== Gender.NONE;
    if (useSeparateSequence) countingScope = countingScope.filter(t => t.gender === gender);
    const lastNum = countingScope.length > 0 ? Math.max(...countingScope.map(t => t.rawNumber)) : 0;
    const nextNum = lastNum + 1;
    let ticketNumber = String(nextNum).padStart(3, '0');
    return ticketNumber;
  };

  const handleEnglishNameBlur = async (deptId: string, value: string) => {
    const dept = state.departments.find(d => d.id === deptId);
    if (!dept || !value.trim()) return;
    const shouldTranslate = !dept.nameUrdu || dept.nameUrdu.trim() === "" || dept.nameUrdu === "نئی سروس";
    if (shouldTranslate) {
      setTranslatingId(deptId);
      const translation = await translateToUrdu(value);
      if (translation) updateDepartment(deptId, { nameUrdu: translation });
      setTranslatingId(null);
    }
  };

  const handleDeptIconUpload = (e: React.ChangeEvent<HTMLInputElement>, deptId: string) => {
    const file = e.target.files?.[0];
    if (file) {
        if (file.size > 100 * 1024) { 
            alert("Icon file is too large. Please use an SVG or Image under 100KB."); 
            return; 
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            updateDepartment(deptId, { customIcon: reader.result as string });
        };
        reader.readAsDataURL(file);
    }
  };

  const generateToken = (deptId: string, gender: Gender, groupId: string) => {
    const token = addToken(deptId, gender, groupId);
    setLastToken(token);
    resetSelection();
    
    // Use a very small timeout to allow React to mount the hidden print area
    setTimeout(() => {
      const printArea = document.getElementById('printable-token-area');
      if (!printArea) return;
      
      const existingIframe = document.getElementById('kiosk-print-frame');
      if (existingIframe && existingIframe.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'kiosk-print-frame';
      // Create hidden iframe completely off-screen
      Object.assign(iframe.style, { 
          position: 'fixed', 
          left: '-9999px', 
          top: '-9999px', 
          width: '0', 
          height: '0', 
          border: '0', 
          visibility: 'hidden',
          overflow: 'hidden'
      });
      
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        // We inject the basic styles needed for the receipt directly to avoid waiting for external CSS
        doc.write(`
          <html>
            <head>
              <style>
                @page { size: auto; margin: 0mm; }
                body { margin: 5mm; padding: 0; font-family: sans-serif; text-align: ${printSettings.textAlign}; }
                h1, h2, h3, h4, p { margin: 0; padding: 0; }
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
                .opacity-70 { opacity: 0.7; }
              </style>
            </head>
            <body>${printArea.innerHTML}</body>
          </html>
        `);
        doc.close();
        
        // Print immediately
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Restore focus to main window to prevent blocking/sticky focus on invisible frame
        window.focus();
        
        // Remove iframe after a short delay to allow print job to spool
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1000);
      }
    }, 50); // 50ms wait for React render is sufficient
    
    // Auto-dismiss success screen - Reduced to 2s for faster throughput
    setTimeout(() => { setLastToken(null); }, 2000);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { alert("File too large. Please select an image under 1MB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => { updateKioskImage(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 512 * 1024) { alert("File too large. Please select a logo under 512KB."); return; }
      const reader = new FileReader();
      reader.onloadend = () => { updateClinicLogo(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const renderIcon = (iconKey: string | undefined, size: number, className?: string) => {
    const IconComponent = ICON_MAP[iconKey || 'stethoscope'] || Icons.Stethoscope;
    return <IconComponent size={size} className={className} />;
  };

  const handleResetRole = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDeviceRole('UNSET');
  };

  const justifyClass = verticalAlign === 'start' ? 'justify-start' : verticalAlign === 'center' ? 'justify-center' : 'justify-end';
  const alignClass = horizontalAlign === 'start' ? 'items-start' : horizontalAlign === 'center' ? 'items-center' : 'items-end';

  // 1. Success Screen (Token Issued)
  if (lastToken) {
    // ... (Keep existing Success Screen)
    const dept = state.departments.find(d => d.id === lastToken.departmentId);
    const group = state.patientGroups.find(g => g.id === lastToken.patientGroupId);
    
    const displayEng = dept?.showEnglish ?? showEngGlobal;
    const displayUrdu = dept?.showUrdu ?? showUrduGlobal;

    const tokenTime = new Date(lastToken.createdAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
    
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white animate-in fade-in duration-300 p-4">
        <div className="bg-white text-slate-900 p-6 md:p-12 rounded-3xl shadow-2xl text-center max-w-lg w-full max-h-full overflow-y-auto">
          <div className="mb-2 md:mb-4 text-emerald-500 flex justify-center"><Icons.CheckCircle size={64} className="md:w-20 md:h-20" /></div>
          {displayEng && <h2 className="text-lg md:text-2xl font-bold mb-1 tracking-tight">Ticket Issued!</h2>}
          {displayUrdu && <h3 className="text-base md:text-xl font-medium text-emerald-600 mb-2 font-serif">ٹوکن جاری</h3>}
          <div className="bg-slate-50 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-dashed border-slate-200 mb-4 md:mb-8">
            {displayEng && <div className="text-lg md:text-2xl font-black uppercase text-slate-800 leading-none mb-1 tracking-tight truncate">{dept?.name}</div>}
            {displayUrdu && <div className="text-xl md:text-3xl text-slate-700 font-serif mb-4 md:mb-6 truncate">{dept?.nameUrdu}</div>}
            
            {group && (
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 bg-${group.color || 'blue'}-100 text-${group.color || 'blue'}-700`}>
                    {group.name}
                </div>
            )}

            <div className="text-5xl md:text-[7rem] font-black text-slate-900 tracking-tighter mb-2 md:mb-4 leading-none">{lastToken.ticketNumber}</div>
            {lastToken.gender !== Gender.NONE && (
              <div className="mb-4 inline-flex px-4 py-1.5 bg-blue-600 text-white rounded-xl font-bold items-center gap-2 shadow-lg shadow-blue-200">
                {lastToken.gender === 'MALE' ? <Icons.Male size={18} /> : <Icons.Female size={18} />}
                {displayEng && <span className="text-[10px] md:text-xs tracking-widest uppercase">{lastToken.gender}</span>}
                {displayUrdu && <span className="text-base md:text-lg font-serif">{lastToken.gender === 'MALE' ? 'مرد' : 'عورت'}</span>}
              </div>
            )}
            <div className="pt-4 md:pt-6 border-t border-slate-200"><p className="text-slate-400 font-mono text-[10px] uppercase tracking-widest">{tokenTime}</p></div>
          </div>
          <div className="flex justify-center items-center gap-2 text-slate-400 text-[10px] md:text-sm">
             <div className="text-emerald-500 font-bold uppercase tracking-widest"><Icons.CheckCircle size={14} className="inline mr-1" /> Sent to Printer</div>
          </div>
        </div>
        
        {/* Hidden Print Area */}
        <div id="printable-token-area" className="hidden">
           <div className="mb-4 border-dashed-b">
             {displayEng && <h1 style={{ fontSize: `${printSettings.clinicNameSize}px` }} className="font-black leading-tight">{state.clinicName}</h1>}
             {displayUrdu && <p style={{ fontSize: `${printSettings.clinicNameSize * 0.9}px` }} className="font-serif leading-tight">{state.clinicNameUrdu}</p>}
           </div>
           {printSettings.showDate && <p style={{ fontSize: `${printSettings.dateSize}px` }} className="font-mono mb-4 border-dashed-b">{tokenTime}</p>}
           {printSettings.showDepartment && (
             <div className="my-4 border-dashed-b">
               {displayEng && <p style={{ fontSize: `${printSettings.deptNameSize}px` }} className="font-black uppercase leading-none mb-2">{dept?.name}</p>}
               {displayUrdu && <p style={{ fontSize: `${printSettings.deptNameSize}px` }} className="font-serif leading-none">{dept?.nameUrdu}</p>}
             </div>
           )}
           <h2 style={{ fontSize: `${printSettings.tokenNumberSize}px` }} className="font-black my-4 leading-none tracking-tighter">{lastToken.ticketNumber}</h2>
           
           {printSettings.showPatientGroup && group && (
               <div className="border-dashed-b mb-4">
                 <p style={{ fontSize: `${printSettings.footerSize * 1.2}px` }} className="font-bold uppercase">{group.name}</p>
               </div>
           )}

           {printSettings.showGender && lastToken.gender !== Gender.NONE && (
               <p style={{ fontSize: `${printSettings.footerSize * 1.2}px` }} className="font-bold mb-4 uppercase">
                 {displayEng && <span>{lastToken.gender}</span>}
                 {displayEng && displayUrdu && <span> / </span>}
                 {displayUrdu && <span>{lastToken.gender === 'MALE' ? 'مرد' : 'عورت'}</span>}
               </p>
           )}
           <div className="mt-8 space-y-2">
             {displayEng && <p style={{ fontSize: `${printSettings.footerSize}px` }} className="leading-tight opacity-70">{printSettings.footerText}</p>}
             {displayUrdu && <p style={{ fontSize: `${printSettings.footerSize * 1.4}px` }} className="mt-2 font-serif leading-tight opacity-80">{printSettings.footerTextUrdu}</p>}
           </div>
        </div>
      </div>
    );
  }

  // 2. Selection Overlay: Patient Group
  if (selectedDept && !selectedGroup && state.patientGroups.length > 0) {
      const allowedGroups = selectedDept.allowedPatientGroups && selectedDept.allowedPatientGroups.length > 0
          ? state.patientGroups.filter(g => selectedDept.allowedPatientGroups!.includes(g.id))
          : state.patientGroups;
      
      const displayEng = selectedDept.showEnglish ?? showEngGlobal;
      const displayUrdu = selectedDept.showUrdu ?? showUrduGlobal;

      return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col p-6 animate-in fade-in duration-300 h-screen overflow-hidden">
            <div className="text-center shrink-0 mb-6">
                {displayEng && <h2 className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tight uppercase">{selectedDept.name}</h2>}
                {displayUrdu && <h3 className="text-xl md:text-2xl font-serif text-slate-400 mb-2">{selectedDept.nameUrdu}</h3>}
                <div className="inline-block px-4 py-1 rounded-full bg-emerald-900/50 border border-emerald-500/30">
                  <p className="text-emerald-400 font-bold tracking-widest uppercase text-xs">
                    {showEngGlobal && "Select Category"}
                    {showEngGlobal && showUrduGlobal && " / "}
                    {showUrduGlobal && "منتخب کریں"}
                  </p>
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 content-stretch min-h-0 pb-4">
                {allowedGroups.filter(g => g.isActive).sort((a,b) => a.priority - b.priority).map(group => (
                    <button
                        key={group.id}
                        onClick={() => handleGroupSelect(group)}
                        className={`
                          relative overflow-hidden bg-white hover:bg-${group.color || 'blue'}-50 rounded-[2rem] shadow-xl 
                          flex flex-col items-center justify-center text-center p-4
                          group transition-all hover:scale-[1.02] active:scale-95 border-b-[6px] border-${group.color || 'blue'}-200
                          h-full w-full
                        `}
                    >
                        <div className={`
                          bg-${group.color || 'blue'}-100 text-${group.color || 'blue'}-600 
                          p-5 md:p-6 rounded-3xl mb-4 group-hover:bg-${group.color || 'blue'}-600 group-hover:text-white transition-all shadow-sm overflow-hidden w-20 h-20 md:w-28 md:h-28 flex items-center justify-center
                        `}>
                            {group.customIcon ? (
                                <img src={group.customIcon} alt="Icon" className="w-full h-full object-contain rounded-xl" />
                            ) : (
                                renderIcon(group.icon, 48, "w-10 h-10 md:w-16 md:h-16")
                            )}
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                            {showEngGlobal && (
                              <span className="block text-sm md:text-xl font-black uppercase tracking-tight text-slate-800 leading-tight">
                                {group.name}
                              </span>
                            )}
                            {showUrduGlobal && (
                              <span className="block text-base md:text-2xl font-serif text-slate-600 leading-tight">
                                {group.nameUrdu}
                              </span>
                            )}
                        </div>
                        <div className={`absolute top-0 right-0 p-16 bg-${group.color || 'blue'}-500/5 rounded-full -mr-8 -mt-8 pointer-events-none group-hover:bg-${group.color || 'blue'}-500/10 transition-colors`} />
                    </button>
                ))}
            </div>

            <div className="shrink-0 mt-2 text-center">
              <button onClick={resetSelection} className="text-slate-500 hover:text-white inline-flex items-center gap-2 transition-colors px-6 py-3 rounded-xl hover:bg-white/10 group">
                  <Icons.ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  <span className="font-bold uppercase tracking-widest text-sm">Back</span>
              </button>
            </div>
        </div>
      );
  }

  // 3. Selection Overlay: Gender (Same as before)
  if (selectedDept && selectedGroup && selectedDept.isGenderSeparated) {
      // ... (Keep existing Gender Overlay)
      const displayEng = selectedDept.showEnglish ?? showEngGlobal;
      const displayUrdu = selectedDept.showUrdu ?? showUrduGlobal;

      return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
          <div className="max-w-4xl w-full text-center mb-12">
            {displayEng && <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight uppercase">{selectedDept.name}</h2>}
            {displayUrdu && <h3 className="text-2xl md:text-3xl font-serif text-slate-400 mb-8">{selectedDept.nameUrdu}</h3>}
            <div className="inline-flex items-center gap-2 bg-slate-800 rounded-full px-4 py-1 border border-slate-700">
               <span className="text-slate-400 text-xs font-bold uppercase">{selectedGroup.name}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
             <button 
               onClick={() => generateToken(selectedDept.id, Gender.MALE, selectedGroup.id)}
               className="bg-white hover:bg-blue-50 text-blue-600 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-6 group transition-all hover:scale-[1.02] active:scale-95 border-b-8 border-blue-200"
             >
                <div className="bg-blue-100 p-8 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Icons.Male size={70} />
                </div>
                <div className="text-center">
                  {displayEng && <span className="block text-2xl font-black uppercase tracking-tighter mb-1">Male Patient</span>}
                  {displayUrdu && <span className="block text-3xl font-serif font-medium">مرد مریض</span>}
                </div>
             </button>
             
             <button 
               onClick={() => generateToken(selectedDept.id, Gender.FEMALE, selectedGroup.id)}
               className="bg-white hover:bg-pink-50 text-pink-600 p-12 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-6 group transition-all hover:scale-[1.02] active:scale-95 border-b-8 border-pink-200"
             >
                <div className="bg-pink-100 p-8 rounded-full group-hover:bg-pink-600 group-hover:text-white transition-all">
                  <Icons.Female size={70} />
                </div>
                <div className="text-center">
                  {displayEng && <span className="block text-2xl font-black uppercase tracking-tighter mb-1">Female Patient</span>}
                  {displayUrdu && <span className="block text-3xl font-serif font-medium">خاتون مریضہ</span>}
                </div>
             </button>
          </div>

          <button onClick={() => setSelectedGroup(null)} className="mt-16 text-slate-500 hover:text-white flex items-center gap-3 transition-colors px-8 py-4 rounded-2xl hover:bg-white/10 group">
            <Icons.ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold uppercase tracking-widest text-lg">Back</span>
          </button>
        </div>
      );
  }

  // 4. Main Kiosk View
  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <div className="absolute -bottom-24 -right-12 pointer-events-none opacity-[0.03] text-slate-900 rotate-[-15deg] z-0"><MedicalSnakeIcon size={600} /></div>
      
      {/* Reset Role Button (Only in Edit Mode) */}
      {isEditMode && (
         <div className="absolute top-4 left-4 z-50 animate-in slide-in-from-top-4">
            <button 
               onClick={handleResetRole}
               className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-full shadow-2xl font-black uppercase tracking-wider text-xs flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
               <Icons.Cpu size={16} /> Reset Role
            </button>
         </div>
      )}

      {/* ... (Header Section kept same) ... */}
      <div 
        onMouseDown={handleTouchStart} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        className="bg-slate-50 text-slate-900 w-full relative overflow-hidden border-b border-slate-200 active:bg-slate-100 transition-colors cursor-pointer select-none px-2 md:px-6 lg:px-8 h-[18vh] md:h-[15vh] min-h-[100px] shrink-0"
      >
          <div className="max-w-screen-2xl mx-auto flex flex-row h-full shrink-0 z-10 items-center justify-between w-full">
              
              {/* Branding / Logo Section */}
              <div className="flex items-center gap-2 md:gap-4 h-full py-1 pr-4 md:pr-8 border-r border-slate-200 shrink-0 relative group max-w-[45%]">
                  <div 
                    onClick={() => isEditMode && logoInputRef.current?.click()}
                    className={`aspect-square h-[80%] md:h-full bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center p-2 overflow-hidden relative shrink-0 ${isEditMode ? 'cursor-pointer hover:border-blue-300 hover:shadow-md' : ''}`}
                  >
                      {state.logo ? (
                          <img src={state.logo} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                          <Icons.Building className="w-full h-full opacity-90 text-emerald-600 p-2" />
                      )}
                      
                      {isEditMode && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-[10px] font-bold uppercase tracking-widest"><Icons.Upload size={16} /></span>
                          </div>
                      )}
                  </div>
                  <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />

                  <div className="flex flex-col justify-center min-w-0">
                      <div className="font-black text-slate-800 text-[10px] md:text-lg lg:text-xl leading-none uppercase tracking-tight text-left">
                          {isEditMode ? (
                              <input
                                  value={state.kioskWelcomeText || "Welcome to"}
                                  onChange={(e) => updateKioskBranding(e.target.value, state.kioskTitle || state.clinicName, state.kioskSubTitle || state.clinicNameUrdu)}
                                  className="w-full text-slate-800 bg-white border border-slate-300 rounded px-1 mb-1"
                              />
                          ) : (
                              <span>{state.kioskWelcomeText}</span>
                          )}
                          <br/>
                          {isEditMode ? (
                              <input
                                  value={state.kioskTitle || state.clinicName}
                                  onChange={(e) => updateKioskBranding(state.kioskWelcomeText || "Welcome to", e.target.value, state.kioskSubTitle || state.clinicNameUrdu)}
                                  className="text-sm md:text-2xl lg:text-3xl text-emerald-600 block mt-1 bg-white border border-emerald-300 rounded px-1 w-full"
                              />
                          ) : (
                              <span className="text-sm md:text-xl lg:text-2xl xl:text-3xl text-emerald-600 block mt-1 truncate">{state.kioskTitle || state.clinicName}</span>
                          )}
                      </div>
                      {isEditMode ? (
                          <input
                              value={state.kioskSubTitle || state.clinicNameUrdu}
                              onChange={(e) => updateKioskBranding(state.kioskWelcomeText || "Welcome to", state.kioskTitle || state.clinicName, e.target.value)}
                              className="font-serif text-slate-500 text-xs md:text-lg lg:text-2xl leading-none mt-1 md:mt-2 opacity-80 text-left bg-white border border-slate-300 rounded px-1 w-full"
                              dir="rtl"
                          />
                      ) : (
                          <p className="font-serif text-slate-500 text-xs md:text-lg lg:text-2xl xl:text-3xl leading-none mt-1 md:mt-2 opacity-80 text-left truncate">
                              {state.kioskSubTitle || state.clinicNameUrdu}
                          </p>
                      )}
                  </div>
              </div>

              <div className="flex-1 flex flex-col justify-center items-center z-10 px-2 transition-all duration-300 h-full overflow-hidden min-w-0" style={{ containerType: 'inline-size' } as any}>
                 <div className="font-medium tracking-tight text-slate-800 tabular-nums text-center leading-none whitespace-nowrap" style={{ fontSize: 'clamp(2rem, 10cqi, 6rem)' }}>
                   {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                 </div>
                 <div className="text-slate-500 mt-1 md:mt-2 font-normal tracking-wide text-center whitespace-nowrap w-full"><DateDisplay date={currentTime} /></div>
              </div>
              
              <div className={`flex w-24 md:w-40 lg:w-48 flex-col ${isEditMode ? `${justifyClass} ${alignClass}` : 'justify-center items-center'} transition-all duration-300 relative group overflow-hidden border-l border-slate-100 bg-white rounded-3xl ml-2 md:ml-4 h-full shrink-0`}>
                 <div className="relative pointer-events-auto h-full w-full flex items-center justify-center overflow-hidden">
                    <img src={state.kioskImage || randomDefaultImage} alt="Decorative" className="drop-shadow-sm transition-all duration-300 w-full h-full object-cover" style={isEditMode ? { width: `${widthPercent}%`, height: 'auto', objectFit: widthPercent > 100 ? 'cover' : 'contain' } : {}} />
                 </div>
                 {isEditMode && (
                      <div className="absolute top-2 right-2 z-50 w-64 bg-black/80 p-3 rounded-xl flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto shadow-2xl border border-white/10">
                          <div className="text-white/60 text-[10px] font-bold uppercase tracking-wider border-b border-white/10 pb-1 mb-1">Image Settings</div>
                          <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-white text-slate-900 px-2 py-1 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-100 shadow-lg whitespace-nowrap text-[10px]"><Icons.Upload size={12} /> Replace</button>
                            {state.kioskImage && <button onClick={() => updateKioskImage(undefined)} className="bg-red-500 text-white px-2 py-1 rounded-lg font-bold hover:bg-red-600 shadow-lg text-[10px]" title="Reset to Default"><Icons.Trash2 size={12} /></button>}
                          </div>
                          <div className="flex items-center justify-between"><span className="text-white text-[9px] font-bold uppercase">Vertical</span><div className="flex bg-white/20 p-1 rounded-lg"><button onClick={() => updateKioskImageSettings({ verticalAlign: 'start' })} className={`p-1 rounded ${verticalAlign === 'start' ? 'bg-blue-500 text-white' : 'text-white hover:bg-white/10'}`} title="Top"><Icons.ArrowUp size={12} /></button><button onClick={() => updateKioskImageSettings({ verticalAlign: 'center' })} className={`p-1 rounded ${verticalAlign === 'center' ? 'bg-blue-500 text-white' : 'text-white hover:bg-white/10'}`} title="Middle"><Icons.Minus size={12} /></button><button onClick={() => updateKioskImageSettings({ verticalAlign: 'end' })} className={`p-1 rounded ${verticalAlign === 'end' ? 'bg-blue-500 text-white' : 'text-white hover:bg-white/10'}`} title="Bottom"><Icons.ArrowDown size={12} /></button></div></div>
                          <div><div className="flex justify-between text-white text-[9px] font-bold mb-1 uppercase"><span>Image Scale</span><span>{widthPercent} %</span></div><input type="range" min="20" max="400" value={widthPercent} onChange={(e) => updateKioskImageSettings({ widthPercent: Number(e.target.value) })} className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer" /></div>
                      </div>
                    )}
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
          </div>
      </div>

      <main className="flex-1 p-4 md:p-6 relative z-10 overflow-y-auto">
        <div className={`w-full h-full mx-auto grid gap-3 md:gap-4 ${isEditMode ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 pb-32 overflow-y-auto block' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 content-start'}`}>
          {state.departments.filter(dept => isEditMode || dept.isActive !== false).map(dept => {
             const activeCount = state.tokens.filter(t => t.departmentId === dept.id && t.status === TokenStatus.WAITING).length;
             const maleCount = state.tokens.filter(t => t.departmentId === dept.id && t.status === TokenStatus.WAITING && t.gender === Gender.MALE).length;
             const femaleCount = state.tokens.filter(t => t.departmentId === dept.id && t.status === TokenStatus.WAITING && t.gender === Gender.FEMALE).length;
             const isSeparate = dept.isGenderSeparated && dept.hasSeparateGenderTokenSequences;
             const isHidden = dept.isActive === false;
             
             // Language Override Logic
             const displayEng = dept.showEnglish ?? showEngGlobal;
             const displayUrdu = dept.showUrdu ?? showUrduGlobal;

             const isConfirming = confirmingDeleteId === dept.id;
             const isTranslating = translatingId === dept.id;

             if (isEditMode) {
                return (
                  <div key={dept.id} className={`relative p-3 md:p-4 rounded-2xl border-2 border-dashed flex flex-col ${isHidden ? 'border-slate-300 bg-slate-100 opacity-80' : 'border-yellow-400 bg-yellow-50/80'} shadow-md min-h-[220px] h-auto`}>
                    <div className="flex justify-between items-center mb-2 shrink-0">
                      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-slate-600"><Icons.Settings size={12} /> Configure</div>
                      <div className="flex items-center gap-1.5">
                         {!isConfirming && (
                           <button onClick={() => updateDepartment(dept.id, { isActive: !dept.isActive })} className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${dept.isActive !== false ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'}`}>{dept.isActive !== false ? 'VISIBLE' : 'HIDDEN'}</button>
                         )}
                         {isConfirming ? (
                           <div className="flex items-center gap-1 animate-in slide-in-from-right-1">
                              <button type="button" onClick={() => { removeDepartment(dept.id); setConfirmingDeleteId(null); }} className="bg-red-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">Delete</button>
                              <button type="button" onClick={() => setConfirmingDeleteId(null)} className="bg-slate-300 text-slate-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Cancel</button>
                           </div>
                         ) : (
                           <button type="button" onClick={() => setConfirmingDeleteId(dept.id)} className="bg-red-100 hover:bg-red-600 hover:text-red-500 p-1 rounded-md transition-all active:scale-90"><Icons.Trash2 size={12} /></button>
                         )}
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 pr-1 overflow-y-auto">
                      <div className="flex items-center gap-2">
                        {dept.customIcon ? (
                            <div className="relative group/icon shrink-0">
                                <img src={dept.customIcon} alt="Custom" className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-200" />
                                <button 
                                    onClick={() => updateDepartment(dept.id, { customIcon: undefined })}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/icon:opacity-100 transition-opacity"
                                >
                                    <Icons.XCircle size={10} />
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => cycleIcon(dept)} className={`w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer hover:scale-105 transition-all bg-white shadow-sm border-slate-200 shrink-0`}>
                                {renderIcon(dept.icon, 18, "text-slate-700")}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <label className="flex items-center gap-2 text-[7px] font-black uppercase text-slate-400 leading-none mb-0.5">
                             Prefix & Icon
                             <label className="cursor-pointer text-blue-600 hover:underline ml-auto">
                                Up
                                <input type="file" className="hidden" accept=".svg,image/svg+xml,image/png" onChange={(e) => handleDeptIconUpload(e, dept.id)} />
                             </label>
                          </label>
                          <input value={dept.prefix} onChange={(e) => updateDepartment(dept.id, { prefix: e.target.value.toUpperCase().slice(0, 4) })} className="w-full text-[10px] font-black bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none uppercase" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Title (English)</label>
                        <input value={dept.name} onChange={(e) => updateDepartment(dept.id, { name: e.target.value })} onBlur={(e) => handleEnglishNameBlur(dept.id, e.target.value)} className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none" />
                      </div>

                      <div>
                        <div className="flex justify-between mb-0.5"><label className="text-[7px] font-black uppercase text-slate-400">Title (Urdu)</label>{isTranslating && <span className="text-[7px] font-black text-blue-500 animate-pulse uppercase">AI...</span>}</div>
                        <input value={dept.nameUrdu || ''} onChange={(e) => updateDepartment(dept.id, { nameUrdu: e.target.value })} className="w-full text-xs font-bold font-serif bg-white border border-slate-200 rounded px-1.5 py-0.5 outline-none text-right" dir="rtl" />
                      </div>

                      <div className="bg-white p-1.5 rounded border border-slate-200">
                        <div className="flex flex-wrap gap-1">{SUPPORTED_COLORS.map(c => (<button key={c} onClick={() => updateDepartment(dept.id, { color: c })} className={`w-4 h-4 rounded-full border transition-all ${dept.color === c ? 'border-slate-800 scale-110 shadow-sm' : 'border-transparent hover:scale-105'}`}><div className={`w-full h-full rounded-full bg-${c}-500`} /></button>))}</div>
                      </div>
                    </div>
                  </div>
                );
             }
             return (
              <button 
                key={dept.id} 
                onClick={() => handleDeptSelect(dept)} 
                style={{ containerType: 'inline-size' } as React.CSSProperties}
                className={`relative overflow-hidden text-left p-[2cqi] rounded-[3cqi] border-2 transition-all shadow-sm hover:shadow-xl hover:scale-[1.01] group md:h-full md:aspect-auto aspect-[1.6/1] min-h-[160px] md:min-h-[150px] flex flex-col justify-between ${getColorClass(dept.color)} active:scale-95`}
                aria-label={`Select ${dept.name}`}
              >
                {/* Large Background Watermark Icon */}
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12 pointer-events-none" style={{ width: '70cqi', height: '70cqi' }}>
                    {dept.customIcon ? (
                        <img src={dept.customIcon} alt="" className="w-full h-full object-contain opacity-50" />
                    ) : (
                        renderIcon(dept.icon, 100, "w-full h-full")
                    )}
                </div>
                
                {/* HEADER: Icon + Names */}
                <div className="relative z-10 flex items-start gap-[4cqi] mb-auto"> 
                    <div className="p-[2.5cqi] bg-white rounded-[3cqi] shadow-sm text-slate-800 shrink-0 aspect-square flex items-center justify-center" style={{ width: '25cqi' }}>
                        <div className="w-full h-full flex items-center justify-center p-[2cqi]">
                            {dept.customIcon ? (
                                <img src={dept.customIcon} alt="" className="w-full h-full object-contain" />
                            ) : (
                                renderIcon(dept.icon, 100, "w-full h-full")
                            )}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 pt-[0.5cqi]">
                        {displayEng && <h3 className="font-black tracking-tight leading-tight truncate pb-[0.1em] -mb-[0.1em]" style={{ fontSize: '8cqi' }}>{dept.name}</h3>}
                        {displayUrdu && dept.nameUrdu && <h4 className="font-medium opacity-90 font-serif leading-tight truncate -mt-[1.5cqi] pb-[0.2em]" style={{ fontSize: '7cqi', lineHeight: '1.3' }}>{dept.nameUrdu}</h4>}
                    </div>
                </div>

                {/* FOOTER: Next Ticket & Waiting */}
                <div className="relative z-10 bg-white/80 rounded-[3cqi] p-[3cqi] flex items-end justify-between border border-white/30 mt-[2cqi]">
                    
                    {/* Next Ticket */}
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-[1.5cqi] opacity-60 mb-[1cqi]">
                            <Icons.Printer style={{ width: '8cqi', height: '8cqi' }} /> 
                            <span className="font-bold uppercase tracking-wider leading-none" style={{ fontSize: '5cqi' }}>Next</span> 
                        </div>
                        
                        {isSeparate ? (
                            <div className="flex flex-col gap-[1cqi]">
                                <div className="flex items-center gap-[1.5cqi]">
                                    <span className="font-bold text-blue-800" style={{ fontSize: '5cqi' }}>M</span>
                                    <span className="font-black tabular-nums leading-none" style={{ fontSize: '9cqi' }}>#{getNextTicket(dept.id, Gender.MALE)}</span>
                                </div>
                                <div className="flex items-center gap-[1.5cqi]">
                                    <span className="font-bold text-pink-800" style={{ fontSize: '5cqi' }}>F</span>
                                    <span className="font-black tabular-nums leading-none" style={{ fontSize: '9cqi' }}>#{getNextTicket(dept.id, Gender.FEMALE)}</span>
                                </div>
                            </div>
                        ) : (
                            <span className="font-black tabular-nums tracking-tighter leading-none" style={{ fontSize: '12cqi' }}>#{getNextTicket(dept.id)}</span> 
                        )}
                    </div>

                    {/* Divider */}
                    <div className="w-px self-stretch bg-slate-900/10 mx-[3cqi]" />

                    {/* Waiting Count */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-[1.5cqi] opacity-60 mb-[1cqi]">
                            <span className="font-bold uppercase tracking-wider leading-none" style={{ fontSize: '5cqi' }}>Waiting</span>
                        </div>

                        {isSeparate ? (
                           <div className="flex flex-col items-end gap-[1cqi]">
                               <div className="flex items-center gap-[1.5cqi]">
                                   <span className="font-black leading-none text-slate-800" style={{ fontSize: '9cqi' }}>{maleCount}</span>
                                   <Icons.Male style={{ width: '5cqi', height: '5cqi' }} className="text-blue-600 opacity-80" />
                               </div>
                               <div className="flex items-center gap-[1.5cqi]">
                                   <span className="font-black leading-none text-slate-800" style={{ fontSize: '9cqi' }}>{femaleCount}</span>
                                   <Icons.Female style={{ width: '5cqi', height: '5cqi' }} className="text-pink-600 opacity-80" />
                               </div>
                           </div>
                        ) : (
                           <div className="flex items-center gap-1.5cqi">
                               <span className="font-black leading-none text-slate-800" style={{ fontSize: '12cqi' }}>{activeCount}</span>
                               <Icons.Users style={{ width: '8cqi', height: '8cqi' }} className="text-slate-500/50" />
                           </div>
                        )}
                    </div>
                </div>
              </button>
             );
          })}
          {isEditMode && (
            <button onClick={handleAddCategory} className="flex flex-col items-center justify-center p-6 min-h-[220px] rounded-3xl border-4 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-50 hover:bg-blue-50 transition-all gap-2 group active:scale-95" aria-label="Add Category"><div className="p-4 md:p-6 bg-slate-100 rounded-full group-hover:bg-blue-100 transition-colors"><Icons.Plus size={32} className="md:w-12 md:h-12" /></div><span className="text-base md:text-xl font-bold">Add Category</span></button>
          )}
        </div>
      </main>
    </div>
  );
};
