
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

// Info Card Component for Left/Right Panels
const InfoCard = ({ title, subTitle, icon: Icon, customIcon, color = 'blue', animate = false }: any) => (
  <div className={`flex flex-col items-center justify-center p-4 md:p-6 rounded-[2rem] bg-${color}-900/40 border-2 border-${color}-500/30 backdrop-blur-md shadow-2xl w-full animate-in zoom-in duration-500`}>
      <div className={`text-${color}-400 drop-shadow-[0_0_25px_rgba(255,255,255,0.15)] mb-3 flex items-center justify-center ${animate ? 'animate-pulse' : ''}`}>
          {/* Use DynamicIcon to support masked/colored custom icons */}
          <DynamicIcon 
             customIcon={customIcon} 
             size="8vh" 
             className="w-[8vh] h-[8vh] max-w-[80px] max-h-[80px]" 
          />
          {!customIcon && Icon && <Icon style={{ width: '8vh', height: '8vh', maxWidth: '80px', maxHeight: '80px' }} strokeWidth={1.5} />}
      </div>
      <span className={`text-[clamp(1rem,1.5vw,1.5rem)] font-black uppercase tracking-widest text-${color}-100 text-center leading-tight mb-1`}>
          {title}
      </span>
      {subTitle && (
        <span className={`text-[clamp(1.2rem,2vw,2rem)] font-serif font-bold text-${color}-200 text-center leading-none opacity-90`}>
            {subTitle}
        </span>
      )}
  </div>
);

export const DoorDisplay: React.FC = () => {
  const { state, setDeviceRole, isNetworkSync } = useQueue();
  const [counterId, setCounterId] = useState<string | null>(null);
  
  // Animation state
  const [showPulse, setShowPulse] = useState(false);
  const lastTokenId = useRef<string | null>(null);
  
  // Audio State - Updated to track Key (ID + Time)
  const lastAnnouncedKey = useRef<string>("");
  const [hasInteracted, setHasInteracted] = useState(false);

  // Exit Gesture State (Hold for 2 seconds)
  const [isHolding, setIsHolding] = useState(false);
  const exitTimerRef = useRef<any>(null);

  // Auto-start Logic with Audio Resume
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('counterId');
      const autostart = params.get('autostart') === 'true';
      
      if (id) setCounterId(id);

      const attemptAutoResume = async () => {
          try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  if (ctx.state === 'suspended') {
                      await ctx.resume();
                  }
                  if (ctx.state === 'running') {
                      setHasInteracted(true);
                  }
                  ctx.close();
              }
          } catch(e) {
              console.log("Auto-audio resume failed.");
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
      // Clear query params
      const url = new URL(window.location.href);
      url.searchParams.delete('counterId');
      window.history.pushState({}, '', url);
      setCounterId(null);
    }, 2000);
  };

  const handlePointerUp = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    setIsHolding(false);
  };

  const counter = state.counters.find(c => c.id === counterId);
  const currentToken = state.tokens.find(t => t.counterId === counter?.id && t.status === TokenStatus.SERVING);

  // Visual Pulse Effect
  useEffect(() => {
    if (currentToken && currentToken.id !== lastTokenId.current) {
      setShowPulse(true);
      lastTokenId.current = currentToken.id;
      const timer = setTimeout(() => setShowPulse(false), 3000); // Pulse lasts 3s, blink lasts 1.5s via CSS
      return () => clearTimeout(timer);
    }
  }, [state.tokens, counter?.id]);

  // Audio Announcement Effect - Logic Update for Recall
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
                const urduVoice = selectedVoice || voices.find(v => v.lang.toLowerCase().includes('ur')) || voices.find(v => v.lang.toLowerCase().includes('en'));
                
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

  if (!counterId) {
    return (
      <div className="h-screen bg-slate-900 flex flex-col items-center justify-center p-6 md:p-12 text-center font-sans">
        <Icons.Settings size={64} className="text-slate-700 mb-6 animate-spin" />
        <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest mb-4">Select Entrance Sign</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full max-h-[60vh] overflow-y-auto">
          {state.counters.map(c => (
            <button 
              key={c.id} 
              onClick={() => {
                setCounterId(c.id);
                const url = new URL(window.location.href);
                url.searchParams.set('counterId', c.id);
                window.history.pushState({}, '', url);
              }}
              className="bg-white/5 border border-white/10 hover:bg-white/10 p-6 rounded-2xl text-left transition-all"
            >
              <div className="text-white font-bold">{c.name}</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                {state.departments.find(d => d.id === c.departmentId)?.name}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!counter) return null;

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
        <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mb-6 shadow-2xl animate-pulse shadow-rose-500/50">
           <Icons.Play size={48} className="text-white ml-2" />
        </div>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest mb-4">Start Door Sign</h1>
        <p className="text-slate-400 text-lg">Click anywhere to enable announcements</p>
      </div>
    );
  }

  const dept = state.departments.find(d => d.id === counter.departmentId);
  const patientGroup = state.patientGroups.find(g => g.id === currentToken?.patientGroupId);
  const showUrdu = state.systemLanguage !== 'ENGLISH';
  const showEng = state.systemLanguage !== 'URDU';
  const color = dept?.color || 'blue';
  
  const GroupIcon = Icons.getIcon(patientGroup?.icon);

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden select-none font-sans">
      
      {!isNetworkSync && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest text-center py-1 animate-pulse">
           Reconnecting to Server...
        </div>
      )}

      <header 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className={`relative bg-${color}-600 p-4 md:p-6 flex justify-between items-center shadow-2xl z-20 shrink-0 cursor-pointer select-none active:brightness-110 transition-all overflow-hidden`}
      >
        <div className={`absolute top-0 left-0 h-2 bg-red-500 z-50 transition-all ease-linear duration-[2000ms] ${isHolding ? 'w-full' : 'w-0'}`} />

        <div className="flex items-center gap-3 md:gap-4 max-w-[70%]">
           <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md hidden md:block text-white">
              <DynamicIcon icon={dept?.icon} customIcon={dept?.customIcon} size={24} />
           </div>
           <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 text-white font-black text-xs md:text-sm uppercase tracking-widest leading-none truncate">
                 {showEng && <span>{state.clinicName}</span>}
                 {showEng && showUrdu && <span className="opacity-50">|</span>}
                 {showUrdu && <span className="font-serif">{state.clinicNameUrdu}</span>}
              </div>
           </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full ${counter.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-white font-black text-[10px] md:text-xs uppercase tracking-widest">{counter.isOnline ? 'Active' : 'Offline'}</span>
        </div>
      </header>

      <main className="flex-1 w-full relative overflow-hidden flex flex-col">
        {/* Background Watermark */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.05]">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white animate-pulse">
              <DynamicIcon icon={dept?.icon} customIcon={dept?.customIcon} size="90vh" />
           </div>
        </div>

        {/* Header / Room Name Block */}
        <div className="text-center mt-6 md:mt-10 shrink-0 max-w-full relative z-10 px-4">
          <h2 className="text-white font-black tracking-tighter leading-none break-words" style={{ fontSize: 'clamp(2.5rem, 8vw, 6rem)' }}>{counter.name}</h2>
          <div className="text-slate-400 text-2xl md:text-3xl font-medium mt-2 opacity-80 flex items-center justify-center gap-2">
             {showEng && <span className="uppercase tracking-wide">{dept?.name}</span>}
             {showEng && showUrdu && <span className="opacity-50">|</span>}
             {showUrdu && <span className="font-serif">{dept?.nameUrdu}</span>}
          </div>
        </div>

        {counter.isOnline ? (
          currentToken ? (
            <div className="flex-1 w-full h-full flex flex-col items-center justify-center relative z-10 p-2 md:p-4 min-h-0">
                
                {/* Now Serving Label */}
                <div className="shrink-0 mb-4 h-[8vh] flex items-center">
                     <div className="text-emerald-400 font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-xs md:text-xl flex items-center gap-3 bg-slate-900/50 px-8 py-3 rounded-full border border-emerald-500/30 shadow-lg backdrop-blur-md">
                        {showEng && "Now Serving"}
                        {showEng && showUrdu && <span className="text-slate-600">|</span>}
                        {showUrdu && <span className="font-serif pt-1 leading-none">اب باری ہے</span>}
                     </div>
                </div>

                {/* 3-Column Layout */}
                <div className="flex-1 w-full flex items-center justify-between min-h-0 relative">
                    
                    {/* Left: Patient Category */}
                    <div className="w-[20%] h-full flex flex-col justify-center items-center px-2">
                        {patientGroup && (
                            <div className="animate-in slide-in-from-left-8 duration-700 w-full flex justify-center">
                                <InfoCard 
                                    title={patientGroup.name}
                                    subTitle={patientGroup.nameUrdu}
                                    icon={GroupIcon}
                                    customIcon={patientGroup.customIcon}
                                    color={patientGroup.color || 'blue'}
                                />
                            </div>
                        )}
                    </div>

                    {/* Center: Token */}
                    <div className="flex-1 h-full flex items-center justify-center min-w-0 relative">
                         <div key={`burst-${currentToken.ticketNumber}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vh] h-[60vh] bg-emerald-500/10 blur-[80px] rounded-full animate-pulse pointer-events-none" />
                         
                         <div 
                          className={`text-white font-black leading-none tracking-tighter tabular-nums ${showPulse ? 'animate-blink-3' : ''} drop-shadow-[0_0_50px_rgba(16,185,129,0.4)] text-center whitespace-nowrap`}
                          style={{ 
                              fontSize: 'clamp(8rem, 32vw, 30rem)', 
                              textShadow: '0 20px 60px rgba(0,0,0,0.5)' 
                          }}
                        >
                          {currentToken.ticketNumber}
                        </div>
                    </div>

                    {/* Right: Gender */}
                    <div className="w-[20%] h-full flex flex-col justify-center items-center px-2">
                        {dept?.isGenderSeparated && currentToken.gender !== Gender.NONE && (
                            <div className="animate-in slide-in-from-right-8 duration-700 w-full flex justify-center">
                                <InfoCard 
                                    title={currentToken.gender === 'MALE' ? 'MALE' : 'FEMALE'}
                                    subTitle={currentToken.gender === 'MALE' ? 'مرد' : 'خاتون'}
                                    icon={currentToken.gender === 'MALE' ? Icons.Male : Icons.Female}
                                    color={currentToken.gender === 'MALE' ? 'blue' : 'pink'}
                                    animate={true}
                                />
                            </div>
                        )}
                    </div>

                </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 animate-pulse pb-20">
                <Icons.Users className="w-24 h-24 md:w-40 md:h-40 text-slate-500 mb-6" />
                <span className="text-white font-black uppercase tracking-[0.3em] text-2xl md:text-4xl text-center">Waiting for Call</span>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center pb-20">
            <Icons.XCircle className="w-24 h-24 md:w-40 md:h-40 text-red-500/30 mb-6" />
            <span className="text-slate-600 font-black uppercase tracking-[0.3em] text-2xl md:text-4xl text-center">Clinic Closed</span>
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
