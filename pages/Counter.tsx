
import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { Counter, Token, TokenStatus, Gender, Direction } from '../types';
import * as Icons from '../components/Icons';

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
  'star': Icons.Star
};

const renderIcon = (iconKey: string | undefined, size: number, className?: string) => {
  const IconComponent = ICON_MAP[iconKey || 'stethoscope'] || Icons.Stethoscope;
  return <IconComponent size={size} className={className} />;
};

const getTheme = (color: string | undefined) => {
  const c = color || 'blue';
  return {
    cardBg: `bg-${c}-50`, border: `border-${c}-200`, borderTop: `border-t-${c}-500`, hoverBorder: `hover:border-${c}-400`,
    pill: `bg-white text-${c}-700 shadow-sm group-hover:bg-${c}-50`, icon: `group-hover:bg-${c}-600`,
    iconBg: `bg-${c}-50 text-${c}-500`, textHover: `group-hover:text-${c}-700`, shadow: `hover:shadow-${c}-100`,
    sidebarBadge: `bg-${c}-100 text-${c}-800 border-${c}-200`, bg: `bg-${c}-600`, bgHover: `hover:bg-${c}-700`,
    lightBg: `bg-${c}-50`, lightBgHover: `hover:bg-${c}-100`, text: `text-${c}-700`, shadowColor: `shadow-${c}-200`,
    color: c,
  };
};

const playNewPatientSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Soft "Ping" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05); // Low volume (0.1)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // Audio context might be blocked if no user interaction yet
  }
};

const DateDisplay = ({ date }: { date: Date }) => {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const day = date.getDate();
  const dayStr = String(day).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
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
  return (<span>{weekday}, {dayStr}<sup style={{ fontSize: '0.6em', verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{getOrdinalSuffix(day)}</sup> {month}, {year}</span>);
};

const ConsultationTimer = ({ start, waitedDuration, previousDuration }: { start: number, waitedDuration?: number, previousDuration?: number }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => { setElapsed(Date.now() - start); }, 1000);
    return () => clearInterval(timer);
  }, [start]);
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const waitedMins = waitedDuration ? Math.floor(waitedDuration / 60000) : 0;
  const prevMins = previousDuration ? Math.floor(previousDuration / 60000) : 0;

  return (
    <div className="flex items-center gap-4 bg-white pl-6 pr-4 py-2 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100">
       
       {previousDuration && previousDuration > 0 && (
         <div className="flex flex-col items-end border-r border-slate-100 pr-4 mr-1 animate-in slide-in-from-right-4 fade-in duration-500">
            <div className="text-[9px] font-bold uppercase tracking-widest text-amber-500 mb-0.5 flex items-center gap-1"><Icons.History size={10} /> Prev</div>
            <div className="text-lg font-bold text-amber-600 tabular-nums leading-none">{prevMins}m</div>
         </div>
       )}

       <div className="flex flex-col items-end border-r border-slate-100 pr-4 mr-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Waited</div>
          <div className="text-lg font-bold text-slate-600 tabular-nums leading-none">{waitedMins}m</div>
       </div>
       <div className="flex flex-col items-end">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full bg-red-500 ${totalSeconds % 2 === 0 ? 'opacity-100 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'opacity-30'} transition-all duration-300`} />Timer</div>
          <div className="font-mono text-3xl font-black text-slate-800 tracking-tighter leading-none tabular-nums relative top-[1px]">{String(minutes).padStart(2, '0')}<span className="text-slate-300 mx-0.5 animate-pulse relative -top-0.5">:</span>{String(seconds).padStart(2, '0')}</div>
       </div>
       <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100"><Icons.Clock size={18} strokeWidth={2.5} /></div>
    </div>
  );
};

const WaitTimeBadge = ({ createdAt }: { createdAt: number }) => {
  const [mins, setMins] = useState(0);
  useEffect(() => {
    setMins(Math.floor((Date.now() - createdAt) / 60000));
    const i = setInterval(() => { setMins(Math.floor((Date.now() - createdAt) / 60000)); }, 60000);
    return () => clearInterval(i);
  }, [createdAt]);
  const colorClass = mins > 30 ? 'bg-red-100 text-red-700' : mins > 15 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600';
  return (<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colorClass}`}>{mins}m</span>);
};

export const CounterView: React.FC = () => {
  const { state, callNextToken, updateTokenStatus, toggleCounterStatus, isEditMode, setIsEditMode, setDeviceRole, updateCounter, addCounter, removeCounter, updateTokenData, releaseCounterTokens, transferToken, boundCounterId, bindDevice, unbindDevice } = useQueue();
  const [activeCounterId, setActiveCounterId] = useState<string | null>(boundCounterId);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [showOfflineConfirm, setShowOfflineConfirm] = useState(false);
  
  // Sidebar State
  const [expandHold, setExpandHold] = useState(false);
  const [expandHistory, setExpandHistory] = useState(false);
  
  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetDeptId, setTransferTargetDeptId] = useState<string>('');
  const [keepInQueue, setKeepInQueue] = useState(false);

  // Edit Mode Gesture
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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update active counter if bound id changes (e.g. initial load)
  useEffect(() => {
      if (boundCounterId && !activeCounterId) {
          setActiveCounterId(boundCounterId);
      }
  }, [boundCounterId]);

  // Launch function for manual use
  const handleLaunchDisplay = (type: 'window' | 'entrance', id: string) => {
    if (id) {
      const view = type === 'window' ? 'counter-display' : 'door-display';
      const width = window.screen.width;
      const left = width; // Push to 2nd monitor
      
      // Use autostart=true to skip click-to-play
      window.open(
          `${window.location.origin}${window.location.pathname}?view=${view}&counterId=${id}&autostart=true`, 
          `SecondaryDisplay_${view}_${id}`, 
          `left=${left},top=0,width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no`
      );
    }
  };

  // Auto-launch Logic for Room Display (Enhanced for Binding)
  useEffect(() => {
    const shouldAutoLaunch = localStorage.getItem('zenqueue_dual_screen') === 'true' || !!boundCounterId;
    if (shouldAutoLaunch && activeCounterId) {
        // Use session storage key specific to this counter to avoid infinite loops
        const key = `window_launched_${activeCounterId}`;
        if (!sessionStorage.getItem(key)) {
             handleLaunchDisplay('window', activeCounterId);
             sessionStorage.setItem(key, 'true');
        }
    }
  }, [activeCounterId, boundCounterId]);

  const activeCounter = state.counters.find(c => c.id === activeCounterId);
  const currentToken = state.tokens.find(t => t.counterId === activeCounterId && t.status === TokenStatus.SERVING);
  const activeDept = state.departments.find(d => d.id === activeCounter?.departmentId);

  // Sorting logic duplicated from context for visual consistency in list
  const getPatientGroupPriority = (groupId?: string): number => {
    if (!groupId) return 10;
    const group = state.patientGroups?.find(g => g.id === groupId);
    return group ? group.priority : 10;
  };
  
  const waitingList = activeCounter ? state.tokens.filter(t => {
        const isDeptMatch = t.departmentId === activeCounter.departmentId;
        const isStatusMatch = t.status === TokenStatus.WAITING;
        let isGenderMatch = true;
        if (activeCounter.servedGender && activeCounter.servedGender !== Gender.NONE) isGenderMatch = t.gender === activeCounter.servedGender;
        
        let isGroupMatch = true;
        if (activeCounter.servedPatientGroupId) isGroupMatch = t.patientGroupId === activeCounter.servedPatientGroupId;

        return isDeptMatch && isStatusMatch && isGenderMatch && isGroupMatch;
    }).sort((a, b) => {
        if (a.isEmergency && !b.isEmergency) return -1;
        if (!a.isEmergency && b.isEmergency) return 1;

        // Group Priority Sorting
        const pA = getPatientGroupPriority(a.patientGroupId);
        const pB = getPatientGroupPriority(b.patientGroupId);
        
        if (pA !== pB) return pA - pB;

        return a.createdAt - b.createdAt;
    }) : [];

  // Sound Notification Effect for New Patients
  const prevWaitingCount = useRef(waitingList.length);
  useEffect(() => {
    if (activeCounter && waitingList.length > prevWaitingCount.current) {
       playNewPatientSound();
    }
    prevWaitingCount.current = waitingList.length;
  }, [waitingList.length, activeCounter]);

  const holdTokens = activeCounter ? state.tokens.filter(t => {
      const isDeptMatch = t.departmentId === activeCounter.departmentId;
      const isStatusMatch = t.status === TokenStatus.ON_HOLD || t.status === TokenStatus.DEFERRED;
      let isGenderMatch = true;
      if (activeCounter.servedGender && activeCounter.servedGender !== Gender.NONE) isGenderMatch = t.gender === activeCounter.servedGender;
      
      let isGroupMatch = true;
      if (activeCounter.servedPatientGroupId) isGroupMatch = t.patientGroupId === activeCounter.servedPatientGroupId;

      return isDeptMatch && isStatusMatch && isGenderMatch && isGroupMatch;
  }) : [];
  
  const historyTokens = activeCounter ? state.tokens.filter(t => t.counterId === activeCounterId && (t.status === TokenStatus.COMPLETED || t.status === TokenStatus.MISSED)).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)).slice(0, 50) : [];

  // Auto-expand/collapse logic based on content
  const prevHoldLength = useRef(holdTokens.length);
  useEffect(() => {
    if (holdTokens.length > 0 && prevHoldLength.current === 0) setExpandHold(true);
    if (holdTokens.length === 0 && prevHoldLength.current > 0) setExpandHold(false);
    prevHoldLength.current = holdTokens.length;
  }, [holdTokens.length]);

  const completedCount = state.tokens.filter(t => t.counterId === activeCounterId && t.status === TokenStatus.COMPLETED).length;
  const avgServiceTime = (() => {
      const served = state.tokens.filter(t => t.counterId === activeCounterId && t.status === TokenStatus.COMPLETED && t.servedAt && t.completedAt);
      if (!served.length) return 0;
      const total = served.reduce((acc, t) => acc + (t.completedAt! - t.servedAt!), 0);
      return Math.round(total / served.length / 60000);
  })();

  const showEngActive = state.systemLanguage !== 'URDU';
  const showUrduActive = state.systemLanguage !== 'ENGLISH';
  
  const activeTheme = getTheme(activeDept?.color);
  const totalWaiting = state.tokens.filter(t => t.status === TokenStatus.WAITING).length;
  
  const deptStats = state.departments.filter(d => d.isActive !== false).map(dept => {
        const count = state.tokens.filter(t => t.departmentId === dept.id && t.status === TokenStatus.WAITING).length;
        return { ...dept, count };
    });

  const handleAddCounter = () => {
    const newId = `c_${Date.now()}`;
    addCounter({ id: newId, name: "New Counter", departmentId: state.departments[0]?.id || '', isOnline: true, servedGender: Gender.NONE, direction: 'NONE' });
  };

  const cycleGender = (current: Gender | undefined) => { if (current === Gender.MALE) return Gender.FEMALE; if (current === Gender.FEMALE) return Gender.NONE; return Gender.MALE; };
  const handleStatusChange = (status: TokenStatus) => { if (!currentToken) return; updateTokenStatus(currentToken.id, status); };
  
  const recallPatient = (token: Token) => { 
    updateTokenData(token.id, { 
      isRecalled: true,
      recallCount: (token.recallCount || 0) + 1,
      servedAt: Date.now() // Force timestamp update to trigger spotlight on Display
    });
    
    if (activeCounterId && !currentToken) {
        updateTokenStatus(token.id, TokenStatus.SERVING, activeCounterId);
    } else if (token.status !== TokenStatus.SERVING) {
        if (token.status === TokenStatus.ON_HOLD || token.status === TokenStatus.DEFERRED) {
           updateTokenStatus(token.id, TokenStatus.SERVING, activeCounterId!);
        }
    }
  };

  const attemptGoOffline = () => {
    if (!activeCounter) return;
    const hasActive = !!currentToken;
    const hasHolds = holdTokens.filter(t => t.counterId === activeCounter.id).length > 0;
    
    if (hasActive || hasHolds) {
      setShowOfflineConfirm(true);
    } else {
      toggleCounterStatus(activeCounter.id);
    }
  };

  const confirmOffline = (action: 'RETURN_TO_POOL' | 'COMPLETE') => {
    if (!activeCounter) return;
    releaseCounterTokens(activeCounter.id, action);
    setShowOfflineConfirm(false);
  };

  const handleTransfer = (priorityLevel: 'NORMAL' | 'PRIORITY' | 'EMERGENCY') => {
    if (!currentToken || !transferTargetDeptId) return;
    transferToken(currentToken.id, transferTargetDeptId, priorityLevel, keepInQueue);
    setShowTransferModal(false);
    setTransferTargetDeptId('');
    setKeepInQueue(false);
  };

  const handleResetRole = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeviceRole('UNSET');
    unbindDevice(); // Ensure unbind on reset
  };

  const handleCounterSelect = (id: string) => {
      // Automatically bind the device to this counter for persistent access
      bindDevice(id);
      setActiveCounterId(id);
  };

  const handleUnbindDevice = () => {
      if (confirm("Unbind this device from this room? You will see the room selection screen next time.")) {
          unbindDevice();
          setActiveCounterId(null);
      }
  };

  const getGroup = (groupId?: string) => state.patientGroups?.find(g => g.id === groupId);

  const DirectionToggle = ({ current, onChange }: { current: Direction | undefined, onChange: (d: Direction) => void }) => (
    <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
        <button onClick={() => onChange('LEFT')} className={`p-1.5 rounded-md transition-colors ${current === 'LEFT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Left"><Icons.ArrowLeft size={16} /></button>
        <button onClick={() => onChange('STRAIGHT')} className={`p-1.5 rounded-md transition-colors ${current === 'STRAIGHT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Straight"><Icons.ArrowUp size={16} /></button>
        <button onClick={() => onChange('RIGHT')} className={`p-1.5 rounded-md transition-colors ${current === 'RIGHT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Right"><Icons.ArrowRight size={16} /></button>
        <button onClick={() => onChange('NONE')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-colors ${!current || current === 'NONE' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}>None</button>
    </div>
  );

  // --- New Logic for "Finish & Next" and Gestures ---
  const handleNextPatientAction = () => {
     if (!activeCounterId) return;
     
     // 1. Complete Current
     if (currentToken) {
         updateTokenStatus(currentToken.id, TokenStatus.COMPLETED);
     }
     
     // 2. Call Next (with delay)
     const hasWaiting = waitingList.length > 0 || holdTokens.length > 0;
     if (hasWaiting) {
         // Tiny delay to let state settle/animate
         setTimeout(() => {
             callNextToken(activeCounterId);
         }, 50); 
     }
  };

  // Swipe Gesture Logic
  const minSwipeDistance = 50;
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    if (isLeftSwipe) {
       if (navigator.vibrate) navigator.vibrate(50);
       handleNextPatientAction();
    }
  };
  // --------------------------------------------------

  if (!activeCounterId) {
    return (
      <div className="h-full flex flex-col bg-slate-50 relative overflow-hidden">
        {/* Header with Gesture - REDUCED HEIGHT */}
        <div 
            onMouseDown={handleTouchStart} onMouseUp={handleTouchEnd} onMouseLeave={handleTouchEnd} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
            className={`bg-slate-50 text-slate-900 flex w-full relative overflow-hidden border-b transition-colors h-auto min-h-[160px] shrink-0 z-10 shadow-sm cursor-pointer select-none ${isEditMode ? 'bg-yellow-50 border-yellow-400' : 'border-slate-200'}`}
        >
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
          <div className="flex-1 flex flex-col md:flex-row items-center p-4 gap-6 relative z-30 w-full pointer-events-none">
             <div className="flex-1 w-full overflow-hidden self-stretch flex items-center order-2 md:order-1"><div className="flex items-center gap-4 w-full overflow-x-auto pb-2 no-scrollbar pr-4"><div className="shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm w-36 h-32 flex flex-col items-center justify-center relative overflow-hidden group"><div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Icons.Users size={48} /></div><span className="text-5xl font-black text-slate-800 leading-none">{totalWaiting}</span><span className="text-xs uppercase font-bold text-slate-400 mt-2 text-center leading-tight">Total<br/>Waiting</span></div><div className="flex flex-col flex-wrap h-32 gap-3 content-start">{deptStats.map(d => { const c = d.color || 'blue'; return (<div key={d.id} className={`w-52 flex items-center gap-4 p-3 pr-4 rounded-xl border shadow-sm transition-all hover:shadow-md h-[3.6rem] bg-${c}-50 border-${c}-200 hover:border-${c}-300`}><div className={`p-2 rounded-lg shrink-0 bg-white shadow-sm text-${c}-600`}>{renderIcon(d.icon, 20)}</div><div className="flex-1 min-w-0 flex flex-col justify-center"><div className={`text-sm font-bold truncate leading-tight text-${c}-900`}>{d.name}</div>{d.nameUrdu && showUrduActive && <div className={`text-xs font-serif truncate leading-tight text-${c}-700 opacity-80 mt-0.5`}>{d.nameUrdu}</div>}</div><div className={`text-3xl font-black text-${c}-700 shrink-0`}>{d.count}</div></div>); })}</div></div></div>
             <div className="hidden md:block w-px h-24 bg-slate-200 shrink-0 order-1 md:order-2"></div>
             <div className="flex flex-col items-center md:items-end shrink-0 min-w-fit order-3 md:order-3"><div className="text-5xl md:text-6xl font-bold tracking-tight text-slate-800 tabular-nums whitespace-nowrap leading-none">{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div><div className="text-lg md:text-xl text-slate-400 mt-2 font-medium tracking-wide whitespace-nowrap"><DateDisplay date={currentTime} /></div></div>
          </div>
        </div>
        <main className="flex-1 p-8 overflow-y-auto relative z-10">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-widest text-center md:text-left">Assign Room to Device</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {state.counters.map(c => {
                 const dept = state.departments.find(d => d.id === c.departmentId);
                 const theme = getTheme(dept?.color);
                 const waitingCount = state.tokens.filter(t => { 
                    const isDeptMatch = t.departmentId === c.departmentId; 
                    const isStatusMatch = t.status === TokenStatus.WAITING; 
                    let isGenderMatch = true; 
                    if (c.servedGender && c.servedGender !== Gender.NONE) isGenderMatch = t.gender === c.servedGender; 
                    
                    let isGroupMatch = true;
                    if (c.servedPatientGroupId) isGroupMatch = t.patientGroupId === c.servedPatientGroupId;

                    return isDeptMatch && isStatusMatch && isGenderMatch && isGroupMatch; 
                 }).length;
                 const servingToken = state.tokens.find(t => t.counterId === c.id && t.status === TokenStatus.SERVING);
                 const isConfirming = confirmingDeleteId === c.id;

                 if (isEditMode) {
                   return (
                     <div key={c.id} className="bg-yellow-50 border-4 border-dashed border-yellow-400 p-6 rounded-3xl shadow-lg relative group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-1 text-xs font-bold text-yellow-800 uppercase tracking-wider"><Icons.Settings size={14} /> Edit</div>
                          {isConfirming ? (
                             <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeCounter(c.id); setConfirmingDeleteId(null); }} className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase active:scale-95 shadow-sm">Del?</button>
                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDeleteId(null); }} className="bg-slate-300 text-slate-700 px-2 py-1 rounded text-[10px] font-bold uppercase active:scale-95">No</button>
                             </div>
                          ) : (
                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDeleteId(c.id); }} className="bg-red-100 hover:bg-red-600 hover:text-red-500 p-2 rounded-lg transition-all relative z-50 shadow-sm active:scale-90" title="Delete Counter"><Icons.Trash2 size={18} className="pointer-events-none" /></button>
                          )}
                        </div>
                        <input value={c.name} onChange={(e) => updateCounter(c.id, { name: e.target.value })} className="w-full text-base font-bold bg-white border border-yellow-300 rounded-xl px-3 py-2 mb-3 text-slate-800 focus:outline-none" />
                        <input value={c.doctorName || ''} onChange={(e) => updateCounter(c.id, { doctorName: e.target.value })} placeholder="Doctor Name (Optional)" className="w-full text-sm bg-white border border-yellow-300 rounded-xl px-3 py-2 mb-3 text-slate-800 focus:outline-none placeholder:text-slate-400" />
                        <select value={c.departmentId} onChange={(e) => updateCounter(c.id, { departmentId: e.target.value })} className="w-full bg-white border border-yellow-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none mb-3">{state.departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}</select>
                        <select 
                            value={c.servedPatientGroupId || ''} 
                            onChange={(e) => updateCounter(c.id, { servedPatientGroupId: e.target.value || undefined })}
                            className="w-full bg-white border border-yellow-300 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none mb-3"
                        >
                            <option value="">All Patient Groups</option>
                            {state.patientGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Wayfinding</span>
                            <DirectionToggle current={c.direction} onChange={(d) => updateCounter(c.id, { direction: d })} />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                           <button onClick={() => updateCounter(c.id, { servedGender: cycleGender(c.servedGender) })} className="w-full py-1.5 px-1 rounded-lg border-2 font-bold text-xs bg-white text-slate-600">{c.servedGender || 'Any'}</button>
                           <button onClick={() => toggleCounterStatus(c.id)} className={`w-full py-1.5 px-1 rounded-lg border-2 font-bold text-xs ${c.isOnline ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-red-100 border-red-300 text-red-800'}`}>{c.isOnline ? 'Online' : 'Offline'}</button>
                        </div>
                     </div>
                   );
                 }
                 const restrictedGroup = c.servedPatientGroupId ? state.patientGroups.find(g => g.id === c.servedPatientGroupId) : null;
                 
                 return (
                  <button key={c.id} onClick={() => handleCounterSelect(c.id)} disabled={!c.isOnline} 
                    className={`relative overflow-hidden text-left p-5 min-h-[260px] rounded-3xl border-2 transition-all shadow-sm group flex flex-col ${c.isOnline ? `${theme.cardBg} ${theme.border} ${theme.borderTop} border-t-8 ${theme.hoverBorder} hover:-translate-y-1 ${theme.shadow}` : 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'}`}
                  >
                      {c.isOnline && <div className="absolute -right-6 -bottom-6 opacity-[0.05] group-hover:opacity-10 transition-opacity rotate-12">{renderIcon(dept?.icon, 140, theme.text)}</div>}
                      
                      <div className="absolute top-4 right-4 z-20"><div className={`w-3 h-3 rounded-full ${c.isOnline ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`} /></div>

                      <div className="relative z-10 flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors truncate max-w-full ${c.isOnline ? theme.pill : 'bg-slate-100 text-slate-500'}`}>
                                      {showEngActive ? dept?.name : dept?.nameUrdu}
                                  </span>
                              </div>
                              
                              <h3 className={`text-xl md:text-2xl font-bold text-slate-800 leading-tight transition-colors break-words ${c.isOnline ? theme.textHover : ''}`}>
                                  {c.name}
                              </h3>
                              
                              {showUrduActive && showEngActive && dept?.nameUrdu && (
                                  <h4 className="text-base font-serif text-slate-400 mt-1 leading-relaxed">{dept.nameUrdu}</h4>
                              )}

                              {c.doctorName && (
                                  <div className={`flex items-center gap-1.5 mt-2 text-sm font-medium transition-colors ${c.isOnline ? theme.text : 'text-slate-400'}`}>
                                      <Icons.Stethoscope size={14} className="shrink-0" />
                                      <span className="truncate">{c.doctorName}</span>
                                  </div>
                              )}
                          </div>

                          {c.isOnline && (
                              <div className="text-right shrink-0 flex flex-col items-end pl-2">
                                  <div className={`text-5xl md:text-6xl font-black ${theme.text} leading-none tracking-tighter drop-shadow-sm flex items-center justify-end gap-2`}>
                                      <Icons.Users size={24} className="opacity-20 mb-1" />
                                      {waitingCount}
                                  </div>
                                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">Waiting</div>
                              </div>
                          )}
                      </div>

                      <div className="flex-1" />

                      {(restrictedGroup || c.servedGender !== Gender.NONE) && (
                          <div className="relative z-10 mb-3 flex flex-wrap gap-2">
                               {restrictedGroup && (
                                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-${restrictedGroup.color}-100 text-${restrictedGroup.color}-700 border border-${restrictedGroup.color}-200`}>
                                      <Icons.Filter size={10} /> Only {restrictedGroup.name}
                                  </div>
                               )}
                               {c.servedGender !== Gender.NONE && (
                                   <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                      {c.servedGender === Gender.MALE ? <Icons.Male size={10} /> : <Icons.Female size={10} />} Only
                                   </div>
                               )}
                          </div>
                      )}

                      <div className="relative z-10 pt-3 border-t border-slate-200/50 flex items-center justify-between min-h-[40px]">
                          {c.isOnline ? (
                              servingToken ? (
                                  <div className="flex items-center gap-2">
                                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
                                      </span>
                                      <div className="flex flex-col">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-none">In Session</span>
                                          <span className={`font-mono font-black text-xl leading-none ${theme.text} mt-0.5`}>{servingToken.ticketNumber}</span>
                                      </div>
                                  </div>
                              ) : (
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Ready</span>
                              )
                          ) : (
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Closed</span>
                          )}

                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${c.isOnline ? `bg-white text-slate-400 ${theme.icon} group-hover:text-white shadow-sm` : 'bg-slate-100 text-slate-300'}`}>
                              <Icons.Cpu size={16} fill="currentColor" />
                          </div>
                      </div>
                  </button>
                 );
              })}
              {isEditMode && (<button onClick={handleAddCounter} className="bg-slate-50 border-4 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all min-h-[224px] group"><div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform"><Icons.Plus size={32} /></div><span className="font-bold">Add New Counter</span></button>)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Active Counter View
  return (
    <div className={`h-full flex flex-col ${activeTheme.lightBg} relative overflow-hidden`}>
       {/* ... existing modals ... */}
       {showOfflineConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 border border-slate-100">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                      <Icons.LogOut size={32} />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 leading-none mb-1">End Shift?</h2>
                      <p className="text-sm font-medium text-slate-500">Active patients detected.</p>
                   </div>
                </div>
                
                <p className="text-slate-600 mb-8 leading-relaxed">
                   You have an active patient or patients on hold. What should happen to them?
                </p>

                <div className="space-y-3">
                   <button onClick={() => confirmOffline('RETURN_TO_POOL')} className="w-full p-4 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold flex items-center justify-between group transition-colors">
                      <div className="flex flex-col text-left">
                         <span className="text-xs uppercase tracking-wider opacity-70">Recommended</span>
                         <span>Return to Queue</span>
                      </div>
                      <Icons.RefreshCcw size={18} className="group-hover:rotate-180 transition-transform" />
                   </button>
                   <button onClick={() => confirmOffline('COMPLETE')} className="w-full p-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold flex items-center justify-between group transition-colors">
                      <div className="flex flex-col text-left">
                         <span className="text-xs uppercase tracking-wider opacity-70">Quick Exit</span>
                         <span>Mark as Completed</span>
                      </div>
                      <Icons.CheckCircle size={18} />
                   </button>
                   <button onClick={() => setShowOfflineConfirm(false)} className="w-full p-4 text-slate-400 hover:text-slate-600 font-bold text-sm">
                      Cancel
                   </button>
                </div>
             </div>
          </div>
       )}

       {showTransferModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
             <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full p-8 border border-slate-100 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 shrink-0">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                         <Icons.CornerUpRight size={24} />
                      </div>
                      <div>
                         <h2 className="text-xl font-black text-slate-900 leading-none mb-1">Referral Center</h2>
                         <p className="text-sm font-medium text-slate-500">Transferring <strong>{currentToken?.ticketNumber}</strong></p>
                      </div>
                   </div>
                   <button onClick={() => setShowTransferModal(false)} className="bg-slate-100 p-2 rounded-full hover:bg-slate-200 text-slate-500"><Icons.XCircle size={24} /></button>
                </div>

                <div className="flex-1 overflow-y-auto mb-6 pr-2">
                   <label className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 block sticky top-0 bg-white z-10 py-2">Select Destination</label>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {state.departments
                         .filter(d => d.id !== activeCounter?.departmentId && d.isActive !== false)
                         .map(d => (
                            <button 
                               key={d.id} 
                               onClick={() => setTransferTargetDeptId(d.id)}
                               className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden group flex items-center gap-6 ${transferTargetDeptId === d.id ? `border-${d.color || 'blue'}-500 bg-${d.color || 'blue'}-50 ring-4 ring-${d.color || 'blue'}-100` : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'}`}
                            >
                               <div className={`p-4 rounded-2xl bg-white shadow-sm text-${d.color || 'slate'}-600 shrink-0 group-hover:scale-110 transition-transform`}>
                                  {renderIcon(d.icon, 40)}
                                </div>
                               <div className="flex-1 min-w-0">
                                  <h4 className="font-black text-slate-800 text-xl leading-tight mb-1">{d.name}</h4>
                                  {showUrduActive && <p className="font-serif text-lg text-slate-500 opacity-80 leading-tight">{d.nameUrdu}</p>}
                               </div>
                               {transferTargetDeptId === d.id && (
                                  <div className="absolute top-4 right-4 bg-blue-600 text-white rounded-full p-1 shadow-lg animate-in zoom-in">
                                     <Icons.CheckCircle size={20} />
                                  </div>
                               )}
                            </button>
                         ))
                      }
                   </div>
                </div>

                <div className="shrink-0 space-y-4 pt-4 border-t border-slate-100 bg-white">
                   <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setKeepInQueue(!keepInQueue)}>
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${keepInQueue ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                         {keepInQueue && <Icons.CheckCircle size={16} className="text-white" />}
                      </div>
                      <div className="flex-1">
                         <span className="text-sm font-bold text-slate-800 block">Expect Return (Keep in List)</span>
                         <span className="text-xs text-slate-500">Patient will stay in your 'Hold' list while visiting the other department.</span>
                      </div>
                   </div>

                   <div className="grid grid-cols-3 gap-3">
                      <button 
                        disabled={!transferTargetDeptId}
                        onClick={() => handleTransfer('NORMAL')}
                        className={`py-4 rounded-xl font-bold border-b-4 transition-all active:scale-95 active:border-b-0 translate-y-0 active:translate-y-1 ${!transferTargetDeptId ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'}`}
                      >
                        <span className="block text-xs uppercase tracking-wider mb-1">Standard</span>
                        Referral
                      </button>
                      <button 
                        disabled={!transferTargetDeptId}
                        onClick={() => handleTransfer('PRIORITY')}
                        className={`py-4 rounded-xl font-bold border-b-4 transition-all active:scale-95 active:border-b-0 translate-y-0 active:translate-y-1 ${!transferTargetDeptId ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'}`}
                      >
                        <span className="block text-xs uppercase tracking-wider mb-1">Priority</span>
                        Referral
                      </button>
                      <button 
                        disabled={!transferTargetDeptId}
                        onClick={() => handleTransfer('EMERGENCY')}
                        className={`py-4 rounded-xl font-bold border-b-4 transition-all active:scale-95 active:border-b-0 translate-y-0 active:translate-y-1 ${!transferTargetDeptId ? 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed' : 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200'}`}
                      >
                        <span className="block text-xs uppercase tracking-wider mb-1">Emergency</span>
                        Referral
                      </button>
                   </div>
                </div>
             </div>
          </div>
       )}

       <header className={`h-16 bg-white border-b ${activeTheme.border} flex items-center justify-between px-6 shrink-0 shadow-sm relative z-20`}>
          <div className="flex items-center gap-6">
             <button onClick={() => { if(!boundCounterId) setActiveCounterId(null); else handleUnbindDevice(); }} className="p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors border border-transparent hover:border-slate-200">
                {boundCounterId ? <Icons.Cpu size={24} /> : <Icons.ArrowLeft size={24} />}
             </button>
             <div>
                <h1 className="text-xl font-black text-slate-800 leading-none">{activeCounter?.name} {boundCounterId && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider align-middle ml-2">Bound</span>}</h1>
                {activeCounter?.doctorName && (
                  <div className="text-sm font-bold text-slate-500 flex items-center gap-1.5 mt-1">
                      <Icons.Stethoscope size={14} />
                      <span>{activeCounter.doctorName}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                   <span className={`text-xs font-bold uppercase tracking-wider ${activeTheme.text}`}>{activeDept?.name}</span>
                   {activeCounter?.servedGender !== Gender.NONE && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                         {activeCounter?.servedGender === Gender.MALE ? <Icons.Male size={10} /> : <Icons.Female size={10} />} Only
                      </span>
                   )}
                   {activeCounter?.servedPatientGroupId && (
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                         <Icons.Filter size={10} /> {state.patientGroups.find(g => g.id === activeCounter.servedPatientGroupId)?.name}
                      </span>
                   )}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-2">
                <button onClick={() => handleLaunchDisplay('window', activeCounter!.id)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold uppercase tracking-wider">
                   <Icons.MonitorPlay size={16} /> Window Screen
                </button>
                <button onClick={() => handleLaunchDisplay('entrance', activeCounter!.id)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold uppercase tracking-wider">
                   <Icons.Layout size={16} /> Door Sign
                </button>
             </div>
             <div className="h-8 w-px bg-slate-200 mx-2" />
             <button 
                onClick={activeCounter?.isOnline ? attemptGoOffline : () => toggleCounterStatus(activeCounter!.id)} 
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCounter?.isOnline ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
             >
                <div className={`w-2 h-2 rounded-full ${activeCounter?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                {activeCounter?.isOnline ? 'Station Online' : 'Station Offline'}
             </button>
          </div>
       </header>

       {/* Body */}
       <div className="flex-1 overflow-hidden flex flex-col md:flex-row relative z-10">
          <aside className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl shrink-0">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2"><Icons.Users size={16} /> Waiting Queue</h3>
                <span className={`px-2 py-1 rounded-lg ${activeTheme.sidebarBadge} text-xs font-bold`}>{waitingList.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {waitingList.map((token) => {
                   const group = getGroup(token.patientGroupId);
                   return (
                      <div key={token.id} className="p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all group flex justify-between items-center relative overflow-hidden">
                         {group && <div className={`absolute top-0 left-0 bottom-0 w-1 bg-${group.color || 'slate'}-500`} />}
                         <div className="flex items-center gap-3 pl-2">
                            <div className={`p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors`}>
                               {token.gender === Gender.MALE ? <Icons.Male size={18} /> : token.gender === Gender.FEMALE ? <Icons.Female size={18} /> : <Icons.Users size={18} />}
                            </div>
                            <div>
                               <span className="block font-black text-slate-700 font-mono text-lg leading-none group-hover:text-blue-700 transition-colors">{token.ticketNumber}</span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group?.name || (token.isEmergency ? 'Emergency' : 'Standard')}</span>
                            </div>
                         </div>
                         <WaitTimeBadge createdAt={token.createdAt} />
                      </div>
                   );
                })}
                {waitingList.length === 0 && (
                   <div className="h-40 flex flex-col items-center justify-center text-slate-300">
                      <Icons.Coffee size={32} className="mb-2 opacity-50" />
                      <span className="text-xs font-bold uppercase tracking-widest">No Patients Waiting</span>
                   </div>
                )}
             </div>
          </aside>

          <main className="flex-1 p-[2vh] flex flex-col items-center relative overflow-y-auto min-w-0 bg-slate-50/50">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none text-slate-900`}>
                {renderIcon(activeDept?.icon, 400)}
             </div>

             {activeCounter?.isOnline && (
               <div className="w-full max-w-5xl mb-[2vh] shrink-0 relative z-20">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-[1vh]">
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-${activeTheme.color}-50 text-${activeTheme.color}-600`}>
                                  <Icons.Users size={20} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Waiting</span>
                          </div>
                          <span className="text-2xl font-black text-slate-800">{waitingList.length}</span>
                      </div>
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                                  <Icons.CheckCircle size={20} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Served</span>
                          </div>
                          <span className="text-2xl font-black text-slate-800">{completedCount}</span>
                      </div>
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                  <Icons.Clock size={20} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Avg Time</span>
                          </div>
                          <span className="text-2xl font-black text-slate-800">{avgServiceTime}m</span>
                      </div>
                      <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                                  <Icons.PauseCircle size={20} />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">On Hold</span>
                          </div>
                          <span className="text-2xl font-black text-slate-800">{holdTokens.length}</span>
                      </div>
                  </div>
               </div>
             )}

             <div className="w-full max-w-2xl flex flex-col gap-[2vh] my-auto relative z-10 pb-[2vh]">
                {activeCounter?.isOnline ? (
                  currentToken ? (
                    <div 
                        className="w-full animate-in zoom-in-95 duration-300"
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                    >
                        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden relative">
                          <div className={`absolute top-0 left-0 right-0 h-2 ${activeTheme.bg}`} />
                          <div className="p-[3vh] text-center flex flex-col h-full justify-center">
                              <div className="shrink-0 mb-[2vh]">
                                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-emerald-50 text-emerald-600 font-black uppercase tracking-[0.2em] text-[10px] border border-emerald-100">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Now Serving
                                  </div>
                              </div>
                              
                              <div className="mb-[2vh] relative shrink-0">
                                <div className="font-black text-slate-800 leading-none tracking-tighter tabular-nums font-mono relative z-10" style={{ fontSize: 'clamp(4rem, 18vh, 9rem)' }}>{currentToken.ticketNumber}</div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-0" />
                                
                                {getGroup(currentToken.patientGroupId) && (
                                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-${getGroup(currentToken.patientGroupId)?.color || 'slate'}-100 text-${getGroup(currentToken.patientGroupId)?.color || 'slate'}-700 font-bold uppercase mt-[1vh] text-xs`}>
                                        {renderIcon(getGroup(currentToken.patientGroupId)?.icon, 14)}
                                        {getGroup(currentToken.patientGroupId)?.name}
                                    </div>
                                )}
                              </div>

                              <div className="flex justify-center mb-[3vh] shrink-0">
                                {currentToken.servedAt && <ConsultationTimer start={currentToken.servedAt} waitedDuration={currentToken.servedAt - currentToken.createdAt} previousDuration={currentToken.totalDuration} />}
                              </div>

                              {/* NEW: FINISH & CALL NEXT BUTTON */}
                              <button 
                                  onClick={handleNextPatientAction}
                                  className="w-full py-[2vh] min-h-[60px] mb-[2vh] bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all group shrink-0 text-sm md:text-base"
                              >
                                  <span>Finish & Call Next</span>
                                  <Icons.SkipForward size={20} className="group-hover:translate-x-1 transition-transform" />
                              </button>

                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0">
                                <button onClick={() => handleStatusChange(TokenStatus.COMPLETED)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all active:scale-95 group h-[80px]">
                                    <Icons.CheckCircle size={24} />
                                    <span className="font-black uppercase tracking-wider text-[9px]">Complete</span>
                                </button>
                                <button onClick={() => handleStatusChange(TokenStatus.ON_HOLD)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-all active:scale-95 h-[80px]">
                                    <Icons.PauseCircle size={24} />
                                    <span className="font-black uppercase tracking-wider text-[9px]">Hold</span>
                                </button>
                                <button onClick={() => recallPatient(currentToken)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all active:scale-95 relative overflow-hidden h-[80px]">
                                    <Icons.Megaphone size={24} className={currentToken.isRecalled ? "animate-pulse" : ""} />
                                    <span className="font-black uppercase tracking-wider text-[9px]">Recall {(currentToken.recallCount || 0) > 0 && `(${currentToken.recallCount})`}</span>
                                </button>
                                <button onClick={() => setShowTransferModal(true)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 transition-all active:scale-95 h-[80px]">
                                    <Icons.CornerUpRight size={24} />
                                    <span className="font-black uppercase tracking-wider text-[9px]">Transfer</span>
                                </button>
                                <button onClick={() => handleStatusChange(TokenStatus.MISSED)} className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all active:scale-95 h-[80px]">
                                    <Icons.UserX size={24} />
                                    <span className="font-black uppercase tracking-wider text-[9px]">No Show</span>
                                </button>
                              </div>
                          </div>
                        </div>
                    </div>
                  ) : (
                    <div className="text-center w-full max-w-lg mx-auto">
                        <div className={`w-40 h-40 ${activeTheme.lightBg} rounded-full flex items-center justify-center mx-auto mb-[4vh] shadow-inner`}>
                          <Icons.UserPlus size={64} className={activeTheme.text} />
                        </div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight mb-[2vh]">Ready for Patient</h2>
                        <p className="text-slate-500 text-lg mb-[4vh]">Queue has {waitingList.length} patients waiting.</p>
                        
                        <button 
                          onClick={() => callNextToken(activeCounter.id)} 
                          disabled={waitingList.length === 0 && holdTokens.length === 0}
                          className={`w-full py-6 rounded-[2rem] text-xl font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${waitingList.length > 0 || holdTokens.length > 0 ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          <Icons.Play size={24} fill="currentColor" /> Call Next Patient
                        </button>
                    </div>
                  )
                ) : (
                  <div className="text-center opacity-50 mx-auto">
                      <div className="bg-slate-200 p-8 rounded-full inline-block mb-6"><Icons.XCircle size={64} className="text-slate-400" /></div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-widest">Station Offline</h2>
                      <p className="mt-2 text-slate-500">Go online to manage the queue</p>
                  </div>
                )}
             </div>
          </main>

          <aside className="flex h-full bg-white border-l border-slate-200 shrink-0 shadow-lg relative z-20">
             <div className="w-12 flex flex-col items-center py-6 gap-6 border-r border-slate-100 bg-white z-20 shrink-0">
                <button 
                   onClick={() => setExpandHold(!expandHold)}
                   className={`flex flex-col items-center gap-2 group transition-all relative py-2 ${expandHold ? 'text-amber-600' : 'text-slate-400 hover:text-amber-500'}`}
                >
                   <Icons.PauseCircle size={20} className={expandHold ? 'drop-shadow-sm' : ''} />
                   <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap rotate-180" style={{ writingMode: 'vertical-rl' }}>On Hold</span>
                   {holdTokens.length > 0 && (
                      <div className="bg-amber-500 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full absolute -top-1 -right-1 shadow-sm border border-white">
                         {holdTokens.length}
                      </div>
                   )}
                   {expandHold && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-amber-500 rounded-l-full" />}
                </button>

                <div className="w-4 h-px bg-slate-200 rounded-full" />

                <button 
                   onClick={() => setExpandHistory(!expandHistory)}
                   className={`flex flex-col items-center gap-2 group transition-all relative py-2 ${expandHistory ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                   <Icons.History size={20} />
                   <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap rotate-180" style={{ writingMode: 'vertical-rl' }}>History</span>
                   {expandHistory && <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-slate-700 rounded-l-full" />}
                </button>
             </div>

             <div className={`flex flex-col h-full bg-slate-50 overflow-hidden transition-all duration-300 relative ${expandHold || expandHistory ? 'w-72 md:w-80' : 'w-0'}`}>
                {expandHold && (
                   <div className={`flex flex-col border-b border-slate-200 bg-amber-50/30 overflow-hidden ${expandHistory ? 'h-1/2' : 'h-full'}`}>
                      <div className="p-4 flex justify-between items-center bg-amber-50/50 sticky top-0 z-10 shrink-0 border-b border-amber-100/50">
                         <h3 className="font-black text-amber-700 uppercase tracking-widest text-xs flex items-center gap-2"><Icons.PauseCircle size={16} /> On Hold</h3>
                         {holdTokens.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">{holdTokens.length}</span>}
                      </div>
                      <div className="overflow-y-auto p-3 space-y-2 flex-1">
                          {holdTokens.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <Icons.Coffee size={24} className="mb-2" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Empty</span>
                             </div>
                          ) : (
                             holdTokens.map((token) => {
                               const referredDept = token.referredToDeptId ? state.departments.find(d => d.id === token.referredToDeptId) : null;
                               return (
                                 <div key={token.id} className={`p-3 rounded-xl bg-white border shadow-sm flex flex-col gap-2 relative group hover:shadow-md transition-all ${referredDept ? 'border-indigo-200 bg-indigo-50/20' : 'border-amber-200'}`}>
                                     <div className="flex justify-between items-start">
                                       <span className="font-black text-slate-700 font-mono text-lg">{token.ticketNumber}</span>
                                       {referredDept ? (
                                          <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                             <Icons.CornerUpRight size={10} /> Referred
                                          </span>
                                       ) : (
                                          <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase">Hold</span>
                                       )}
                                     </div>
                                     
                                     {referredDept && (
                                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-100">
                                            <div className={`p-1 rounded-md bg-${referredDept.color || 'blue'}-50 text-${referredDept.color || 'blue'}-600`}>
                                               {renderIcon(referredDept.icon, 12)}
                                            </div>
                                            <span className="truncate">{referredDept.name}</span>
                                        </div>
                                     )}

                                     <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                                        <Icons.Clock size={10} /> {new Date(token.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                     </div>
                                     
                                     <button onClick={() => recallPatient(token)} className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors mt-1 ${referredDept ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white' : 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'}`}>
                                       Resume Visit
                                     </button>
                                 </div>
                               );
                             })
                          )}
                      </div>
                   </div>
                )}

                {expandHistory && (
                   <div className="flex flex-col bg-white overflow-hidden flex-1 min-h-0">
                      <div className="p-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                         <h3 className="font-black text-slate-500 uppercase tracking-widest text-xs flex items-center gap-2"><Icons.History size={16} /> History</h3>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-2">
                         {historyTokens.map((token) => (
                            <div key={token.id} className={`p-3 rounded-xl border border-slate-100 flex justify-between items-center opacity-70 hover:opacity-100 transition-opacity ${token.status === TokenStatus.MISSED ? 'bg-red-50/50' : 'bg-white'}`}>
                               <div>
                                  <span className={`block font-bold text-sm ${token.status === TokenStatus.MISSED ? 'text-red-400 line-through' : 'text-slate-600'}`}>{token.ticketNumber}</span>
                                  <span className="text-[10px] text-slate-400">{new Date(token.completedAt || 0).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                               </div>
                               {token.status === TokenStatus.MISSED ? (
                                 <div className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase tracking-wider">Missed</div>
                               ) : (
                                 <div className="px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider">Done</div>
                               )}
                            </div>
                         ))}
                         {historyTokens.length === 0 && (
                            <div className="py-8 text-center text-slate-300 text-[10px] font-bold uppercase tracking-wider opacity-60">
                               No History
                            </div>
                         )}
                      </div>
                   </div>
                )}
             </div>
          </aside>
       </div>
    </div>
  );
};
