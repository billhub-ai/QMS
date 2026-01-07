
import React, { useState, useEffect, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { TokenStatus, Gender } from '../types';
import * as Icons from '../components/Icons';
import { DynamicIcon } from '../components/Icons';

// Play a gentle attention chime using standard Audio API (Offline)
const playChime = () => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        
        // Auto-close context after playing to save resources
        setTimeout(() => ctx.close(), 600);
    } catch (e) {
        console.error("Audio Chime Error", e);
    }
};

export const CounterDisplay: React.FC = () => {
  const { state, setDeviceRole } = useQueue();
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(() => {
    return localStorage.getItem('qms_assigned_counter_id');
  });
  const [showPulse, setShowPulse] = useState(false);
  const lastTokenId = useRef<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Audio Refs - Updated to track Key (ID + Time)
  const lastAnnouncedKey = useRef<string>("");

  // Exit Gesture State (Hold for 2 seconds)
  const [isHolding, setIsHolding] = useState(false);
  const exitTimerRef = useRef<any>(null);

  // Auto-start Logic with Audio Resume
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const autostart = params.get('autostart') === 'true';
      
      const attemptAutoResume = async () => {
          try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  // Attempt immediate resume (works if --autoplay-policy=no-user-gesture-required)
                  if (ctx.state === 'suspended') {
                      await ctx.resume();
                  }
                  if (ctx.state === 'running') {
                      setHasInteracted(true);
                  }
                  ctx.close();
              }
          } catch(e) {
              console.log("Auto-audio resume failed, waiting for user click.");
          }
      };

      if (autostart) {
          setHasInteracted(true);
      } else {
          attemptAutoResume();
      }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (exitTimerRef.current) return;

    setIsHolding(true);
    exitTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(200);
      setIsHolding(false);
      exitTimerRef.current = null;
      
      // Direct exit
      setDeviceRole('UNSET');
      localStorage.removeItem('qms_assigned_counter_id');
      setSelectedCounterId(null);
    }, 2000);
  };

  const handlePointerUp = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setIsHolding(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('counterId');
    if (id) {
      setSelectedCounterId(id);
      localStorage.setItem('qms_assigned_counter_id', id);
    }
  }, []);

  const counter = state.counters.find(c => c.id === selectedCounterId);
  const currentToken = state.tokens.find(t => t.counterId === selectedCounterId && t.status === TokenStatus.SERVING);
  const dept = state.departments.find(d => d.id === counter?.departmentId);
  const patientGroup = state.patientGroups.find(g => g.id === currentToken?.patientGroupId);
  
  const showEngGlobal = state.systemLanguage !== 'URDU';
  const showUrduGlobal = state.systemLanguage !== 'ENGLISH';

  // Apply Department Override
  const displayEng = dept?.showEnglish ?? showEngGlobal;
  const displayUrdu = dept?.showUrdu ?? showUrduGlobal;

  const GroupIcon = Icons.getIcon(patientGroup?.icon);

  useEffect(() => {
    if (currentToken && currentToken.id !== lastTokenId.current) {
      setShowPulse(true);
      lastTokenId.current = currentToken.id;
      const timer = setTimeout(() => setShowPulse(false), 2000); // Wait for animation to finish
      return () => clearTimeout(timer);
    }
  }, [currentToken?.id]);

  // OFFLINE TTS Effect - Logic Update for Recall
  useEffect(() => {
    if (!currentToken || !hasInteracted) return;
    
    // Composite key to detect Recall (ID + ServedAt Timestamp)
    const currentKey = `${currentToken.id}_${currentToken.servedAt}`;
    const isRecent = (Date.now() - (currentToken.servedAt || 0)) < 8000;

    // Check against Key instead of ID
    if (currentKey !== lastAnnouncedKey.current && isRecent) {
        lastAnnouncedKey.current = currentKey;

        const ticketNum = currentToken.ticketNumber;
        const urduText = `ٹوکن نمبر ${ticketNum}`; // Just the token number for room display

        const speak = () => {
            window.speechSynthesis.cancel(); 
            playChime();

            setTimeout(() => {
                const u = new SpeechSynthesisUtterance(urduText);
                u.lang = 'ur-PK'; // Force Urdu Language
                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = state.announcementVoiceURI ? voices.find(v => v.voiceURI === state.announcementVoiceURI) : null;
                const urduVoice = selectedVoice || voices.find(v => v.lang.toLowerCase().includes('ur'));
                
                if (urduVoice) u.voice = urduVoice;
                
                // Mature, Soft Settings
                u.rate = 0.85; 
                u.pitch = 0.9; 
                
                window.speechSynthesis.speak(u);
            }, 600);
        };
        
        const t = setTimeout(speak, 500);
        return () => clearTimeout(t);
    }
  }, [currentToken?.id, currentToken?.servedAt, hasInteracted, state.announcementVoiceURI]);

  if (!selectedCounterId) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl max-w-2xl w-full border border-slate-100 text-center">
          <div className="w-16 h-16 md:w-24 md:h-24 bg-blue-50 text-blue-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-inner">
            <Icons.MonitorPlay className="w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Display Configuration</h1>
          <p className="text-slate-500 mb-8 md:mb-10 font-medium text-sm md:text-base">Select which room or window this screen will manage.</p>
          <div className="grid grid-cols-1 gap-3 md:gap-4 max-h-[50vh] overflow-y-auto">
            {state.counters.map(c => {
              const d = state.departments.find(dept => dept.id === c.departmentId);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCounterId(c.id);
                    localStorage.setItem('qms_assigned_counter_id', c.id);
                  }}
                  className="p-4 md:p-6 border-2 border-slate-100 rounded-2xl md:rounded-3xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group active:scale-95"
                >
                  <div className="font-black text-lg md:text-xl text-slate-800 group-hover:text-blue-700 leading-tight">{c.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">{d?.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (!counter) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white p-6 md:p-10">
        <div className="text-center max-w-md">
          <Icons.AlertTriangle size={64} className="mx-auto mb-6 text-red-500 animate-pulse md:w-20 md:h-20" />
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest mb-4">Identity Lost</h1>
          <p className="text-slate-400 mb-8 font-medium text-sm md:text-base">The assigned counter for this screen no longer exists.</p>
          <button 
            onClick={() => {
              setSelectedCounterId(null);
              localStorage.removeItem('qms_assigned_counter_id');
            }} 
            className="bg-white text-slate-900 px-6 py-3 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95"
          >
            Reset Identity
          </button>
        </div>
      </div>
    );
  }

  // Force interaction to enable audio context - Skipped if autostart is true
  if (!hasInteracted) {
    return (
      <div 
        className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center text-center p-6 cursor-pointer" 
        onClick={() => {
            setHasInteracted(true);
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            ctx.resume().then(() => ctx.close());
        }}
      >
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-pulse shadow-emerald-500/50">
           <Icons.Play size={48} className="text-white ml-2" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Start Room Display</h1>
        <p className="text-slate-400 text-lg">Click anywhere to enable voice announcements and full screen mode</p>
      </div>
    );
  }

  const themeColor = dept?.color || 'blue';

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col relative font-sans">
      <div className={`fixed inset-0 z-50 pointer-events-none transition-opacity duration-700 ${showPulse ? 'opacity-100' : 'opacity-0'}`}>
        <div className={`absolute inset-0 bg-${themeColor}-500/30 animate-pulse`} />
        <div className="absolute inset-0 border-[20px] md:border-[40px] border-emerald-500/40 animate-ping" />
      </div>

      <header 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`relative bg-${themeColor}-600 px-4 py-3 md:px-8 md:py-4 flex items-center shrink-0 z-20 shadow-2xl cursor-pointer select-none active:brightness-110 transition-all overflow-hidden h-[20vh] max-h-[200px]`}
      >
        <div className={`absolute top-0 left-0 h-2 bg-red-500 z-50 transition-all ease-linear duration-[2000ms] ${isHolding ? 'w-full' : 'w-0'}`} />

        <div className="flex items-center w-full h-full gap-[2vw]">
           <div className="aspect-square h-full max-h-[85%] bg-white/20 rounded-[1.5rem] backdrop-blur-xl border border-white/10 shadow-inner hidden md:flex items-center justify-center shrink-0 p-3 text-white">
              <DynamicIcon icon={dept?.icon} customIcon={dept?.customIcon} size="60%" />
           </div>
           
           <div className="flex items-center gap-[2vw] min-w-0 flex-1 h-full overflow-hidden">
              <div className="flex flex-col justify-center shrink-0">
                  {/* Room Title */}
                  <h1 
                    className="text-white font-black tracking-tighter leading-none whitespace-nowrap drop-shadow-md" 
                    style={{ fontSize: 'clamp(2rem, 5vw, 6rem)' }}
                  >
                    {counter.name}
                  </h1>
                  {/* Doctor Name */}
                  {counter.doctorName && (
                    <div className="flex items-center gap-2 text-white/90 mt-2 animate-in slide-in-from-left-4 fade-in duration-700">
                        <div className="bg-white/20 p-1 rounded-lg backdrop-blur-sm">
                            <Icons.Stethoscope className="w-3 h-3 md:w-5 md:h-5 text-white" />
                        </div>
                        <span className="font-bold tracking-wide uppercase leading-none" style={{ fontSize: 'clamp(0.8rem, 1.8vw, 1.8rem)' }}>{counter.doctorName}</span>
                    </div>
                  )}
              </div>
              
              {/* Divider */}
              {(displayEng || displayUrdu) && (
                 <div className="w-[2px] h-[40%] bg-white/30 rounded-full shrink-0 mx-2" />
              )}
              
              {/* Department Titles - Single Line (Row) */}
              <div 
                className="flex flex-row items-center gap-4 md:gap-6 min-w-0 flex-1 overflow-hidden h-full"
                style={{ containerType: 'inline-size' }}
              >
                 {displayEng && (
                     <span className="text-white/95 font-bold uppercase tracking-wide truncate leading-none shrink-0" style={{ fontSize: 'clamp(1.5rem, 6cqi, 5rem)' }}>
                        {dept?.name}
                     </span>
                 )}
                 {displayUrdu && (
                     <span className="text-white/90 font-serif truncate leading-tight pt-1 shrink min-w-0" style={{ fontSize: 'clamp(1.8rem, 7cqi, 5.5rem)' }}>
                        {dept?.nameUrdu}
                     </span>
                 )}
              </div>
           </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 relative min-h-0 w-full max-w-full">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse">
              <DynamicIcon icon={dept?.icon} customIcon={dept?.customIcon} size="90vh" />
           </div>
        </div>

        {counter.isOnline ? (
          currentToken ? (
            <div className="w-full flex flex-col items-center animate-in zoom-in-95 duration-1000 relative z-10 justify-center h-full max-h-full">
               <div className="mt-0 mb-2 md:mb-4 shrink-0">
                 {/* Scaled down "Token Number" */}
                 <div className="bg-emerald-500 text-white px-5 py-2 md:px-8 md:py-3 rounded-full shadow-2xl flex items-center gap-3 md:gap-4 border-4 border-emerald-400/30">
                    <Icons.UserPlus className="w-5 h-5 md:w-6 md:h-6 animate-bounce" strokeWidth={3} />
                    <div className="text-center flex items-center gap-3">
                      <span className="font-black uppercase tracking-[0.2em] md:tracking-[0.25em] text-xs md:text-lg block leading-tight whitespace-nowrap">
                        {displayEng && "Token Number"}
                        {displayEng && displayUrdu && " / "}
                        {displayUrdu && <span className="font-serif leading-normal inline-block pt-1">ٹوکن نمبر</span>}
                      </span>
                    </div>
                 </div>
               </div>

               <div 
                  className="bg-white/5 backdrop-blur-3xl rounded-[2rem] md:rounded-[4rem] border-4 border-white/10 relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] md:shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-[98vw] md:max-w-[90vw] lg:max-w-7xl flex-1 min-h-0"
                  style={{ containerType: 'size' }}
               >
                  <div className={`absolute top-0 left-0 w-full h-2 md:h-4 bg-gradient-to-r from-transparent via-emerald-400 to-transparent z-10`} />
                  
                  <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div 
                        className={`font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)] md:drop-shadow-[0_40px_80px_rgba(0,0,0,0.8)] ${showPulse ? 'animate-blink-3' : ''}`}
                        style={{ fontSize: 'clamp(10rem, 50vw, 35rem)', fontFamily: 'ui-monospace, monospace' }}
                    >
                        {currentToken.ticketNumber}
                    </div>
                  </div>

                  {/* Patient Category Badge */}
                  {patientGroup && (
                      <div className="absolute top-6 md:top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 md:gap-4 px-6 py-2 md:px-10 md:py-3 rounded-full bg-white/10 border border-white/20 backdrop-blur-md shadow-lg z-20">
                          <div className={`text-${patientGroup.color || 'blue'}-300`}>
                             <DynamicIcon icon={patientGroup.icon} customIcon={patientGroup.customIcon} size={40} className="w-6 h-6 md:w-10 md:h-10" />
                          </div>
                          <span className={`text-xl md:text-4xl font-black uppercase tracking-widest text-${patientGroup.color || 'blue'}-100`}>
                              {patientGroup.name}
                          </span>
                      </div>
                  )}

                  {dept?.isGenderSeparated && currentToken.gender !== Gender.NONE && (
                      <div className="absolute bottom-6 md:bottom-12 left-0 right-0 flex justify-center items-center z-10">
                        <div className={`flex items-center gap-4 md:gap-8 px-6 py-3 md:px-12 md:py-6 rounded-[1.5rem] md:rounded-[3rem] shadow-2xl border border-white/10 ${currentToken.gender === 'MALE' ? 'bg-blue-600/30 text-blue-400' : 'bg-pink-600/30 text-pink-400'}`}>
                            <div className="p-2 md:p-3 bg-white/10 rounded-2xl md:rounded-[2rem] shadow-inner">
                            {currentToken.gender === 'MALE' ? <Icons.Male className="w-8 h-8 md:w-14 md:h-14" /> : <Icons.Female className="w-8 h-8 md:w-14 md:h-14" />}
                            </div>
                            <div className="text-left flex items-center gap-3">
                            <span className="text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-none block">
                                {displayEng && currentToken.gender}
                                {displayEng && displayUrdu && <span className="mx-3 opacity-50">|</span>}
                                {displayUrdu && <span className="font-serif">{currentToken.gender === 'MALE' ? 'مرد' : 'عورت'}</span>}
                            </span>
                            </div>
                        </div>
                      </div>
                  )}
               </div>
            </div>
          ) : (
            <div className="text-center opacity-20">
               <div className="w-32 h-32 md:w-56 md:h-56 bg-white/5 rounded-[2rem] md:rounded-[4rem] flex items-center justify-center mx-auto mb-6 md:mb-10 text-white/10 border-4 border-dashed border-white/5">
                  <Icons.Users className="w-16 h-16 md:w-28 md:h-28 animate-pulse" />
               </div>
               <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-[0.2em] md:tracking-[0.4em] leading-tight">
                 {displayEng && "Standing By"}
                 {displayEng && displayUrdu && " / "}
                 {displayUrdu && <span className="font-serif leading-relaxed inline-block pt-2">انتظار فرمائیں</span>}
               </h2>
            </div>
          )
        ) : (
           <div className="text-center">
             <div className="w-32 h-32 md:w-56 md:h-56 bg-red-500/10 rounded-[2rem] md:rounded-[5rem] flex items-center justify-center mx-auto mb-8 md:mb-12 text-red-500/30 border-4 border-red-500/20">
                <Icons.XCircle className="w-16 h-16 md:w-28 md:h-28" />
             </div>
             <h2 className="text-4xl md:text-7xl font-black text-white/10 uppercase tracking-[0.2em] leading-none">
                {displayEng && "CLOSED"}
                {displayEng && displayUrdu && " / "}
                {displayUrdu && <span className="font-serif leading-relaxed inline-block pt-2">بند ہے</span>}
             </h2>
           </div>
        )}
      </main>

      <footer className="p-4 md:p-6 text-center border-t border-white/5 shrink-0">
        <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.4em]">Wayfinding System • CMH Quetta</p>
      </footer>
      <style>{`
        @keyframes blink-urgent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink-3 {
          animation: blink-urgent 0.5s step-end 3;
        }
      `}</style>
    </div>
  );
};
