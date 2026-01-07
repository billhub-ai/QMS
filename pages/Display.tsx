
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { TokenStatus, Gender, Token, Direction } from '../types';
import * as Icons from '../components/Icons';
import { GoogleGenAI, Modality } from "@google/genai";
import { DynamicIcon } from '../components/Icons';

interface DisplayProps {
  onExit: () => void;
}

type ViewMode = 'STANDARD' | 'FOCUS_GRID';

const getAvgWait = (tokenList: Token[]) => {
  const servedTokens = tokenList.filter(t => (t.status === TokenStatus.COMPLETED || t.status === TokenStatus.SERVING) && (t.firstServedAt || t.servedAt) && t.createdAt);
  if (servedTokens.length === 0) return 0;
  const totalWait = servedTokens.reduce((acc, t) => {
    const endTime = t.firstServedAt || t.servedAt!;
    return acc + Math.max(0, endTime - t.createdAt);
  }, 0);
  return Math.round(totalWait / servedTokens.length / 60000);
};

const TimeAgo = ({ timestamp, className = "" }: { timestamp?: number, className?: string }) => {
  const [label, setLabel] = useState("");

  useEffect(() => {
    if (!timestamp) return;
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
      if (diff < 1) setLabel("Just now");
      else if (diff < 60) setLabel(`${diff}m ago`);
      else setLabel(`${Math.floor(diff / 60)}h ago`);
    };
    update();
    const interval = setInterval(update, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;
  return <span className={className}>{label}</span>;
};

const ClockWidget = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  
  const weekday = time.toLocaleDateString('en-US', { weekday: 'short' });
  const day = time.getDate();
  const month = time.toLocaleString('en-US', { month: 'short' });
  
  return (
    <div className="flex flex-col items-end leading-none pointer-events-none select-none">
       <div className="font-black tracking-tight text-white tabular-nums leading-none filter drop-shadow-lg mb-2" style={{ fontSize: 'clamp(3rem, 5vw, 6rem)' }}>
         {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
       </div>
       <div className="text-emerald-400 font-bold tracking-widest uppercase flex items-center gap-4 opacity-90" style={{ fontSize: 'clamp(1rem, 1.5vw, 1.5rem)' }}>
         <span>{weekday.toUpperCase()}, {day} {month.toUpperCase()}</span>
       </div>
    </div>
  );
};

// --- AUTO SCROLL HOOK ---
const useAutoScroll = (ref: React.RefObject<HTMLDivElement | null>, speed = 0.5, dependency: any = null) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let animationId: number;
    let accumulatedScroll = 0;
    let direction = 1; 
    let isPaused = false;
    let pauseTimeout: any = null;
    
    const scroll = () => {
      if (!el || !el.isConnected) return;
      if (el.scrollHeight <= el.clientHeight) { el.scrollTop = 0; return; }
      if (isPaused) { animationId = requestAnimationFrame(scroll); return; }
      
      accumulatedScroll += speed;
      if (accumulatedScroll >= 1) {
          const pixels = Math.floor(accumulatedScroll);
          el.scrollTop += pixels * direction;
          accumulatedScroll -= pixels;
      }
      
      if (direction === 1 && Math.ceil(el.scrollTop + el.clientHeight) >= el.scrollHeight) {
          isPaused = true;
          pauseTimeout = setTimeout(() => { direction = -1; isPaused = false; }, 5000); 
      }
      else if (direction === -1 && el.scrollTop <= 0) {
          isPaused = true;
          pauseTimeout = setTimeout(() => { direction = 1; isPaused = false; }, 5000); 
      }
      animationId = requestAnimationFrame(scroll);
    };
    
    // Initial delay
    pauseTimeout = setTimeout(() => {
        animationId = requestAnimationFrame(scroll);
    }, 2000);
    
    return () => { cancelAnimationFrame(animationId); clearTimeout(pauseTimeout); };
  }, [ref, speed, dependency]); 
};

// --- AUDIO UTILS ---
const playChime = (ctx: AudioContext, startTime: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, startTime);
    osc.frequency.exponentialRampToValueAtTime(1000, startTime + 0.1);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
    osc.start(startTime);
    osc.stop(startTime + 0.5);
};

const decodePCM = async (base64: string, ctx: AudioContext) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) { channelData[i] = dataInt16[i] / 32768.0; }
    return buffer;
};

// --- SUB-COMPONENTS ---

const SessionCard = React.memo(({ token, minimal = false }: { token: Token, minimal?: boolean }) => {
  const { state } = useQueue();
  const dept = state.departments.find(d => d.id === token.departmentId);
  const counter = state.counters.find(c => c.id === token.counterId);
  
  if (minimal) {
      return (
        <div className="bg-slate-800 border-l-4 border-emerald-500 flex flex-col justify-center p-3 w-full h-full shadow-lg relative overflow-hidden group">
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-70">
                <Icons.Clock size={12} className="text-slate-400" />
                <TimeAgo timestamp={token.servedAt} className="text-[1.2vh] font-bold text-slate-400 uppercase tracking-wide" />
            </div>
            <div className="font-black text-white font-mono text-[4vh] leading-none mb-1">{token.ticketNumber}</div>
            <div className="font-bold text-emerald-400 text-[2vh] uppercase truncate">{counter?.name || 'Counter'}</div>
        </div>
      );
  }

  return (
    <div className="bg-slate-800 border-l-[8px] border-emerald-500 rounded-r-2xl flex items-center justify-between p-6 mb-4 w-full shadow-lg relative overflow-hidden shrink-0">
        <div className="flex items-center gap-6 relative z-10">
            <span className="font-black text-white font-mono tracking-tighter text-[clamp(3rem,4vw,5rem)] leading-none tabular-nums">
                {token.ticketNumber}
            </span>
        </div>
        <div className="flex flex-col items-end relative z-10 min-w-0">
          <div className="font-black text-emerald-300 uppercase tracking-tight text-[clamp(1.5rem,2vw,2.5rem)] leading-none mb-1 truncate max-w-full">
              {counter?.name}
          </div>
          <div className="font-bold text-slate-400 uppercase tracking-wider text-[clamp(1rem,1.2vw,1.5rem)] truncate max-w-full">
              {dept?.name}
          </div>
          <TimeAgo timestamp={token.servedAt} className="text-slate-500 text-[clamp(0.8rem,1vw,1.2rem)] font-medium mt-1 flex items-center gap-1" />
        </div>
    </div>
  );
});

const ActiveSessionsPanel = ({ tokens, showEng, showUrdu }: { tokens: Token[], showEng: boolean, showUrdu: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoScroll(scrollRef, 0.8, tokens.length); 
  
  return (
    <div className="flex flex-col h-full bg-slate-900/80 rounded-[3rem] border-2 border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="px-8 py-4 bg-slate-800 border-b border-white/10 flex items-center gap-6 shrink-0 h-[80px]">
          <Icons.History className="text-emerald-500 w-8 h-8" />
          <h3 className="font-black uppercase tracking-[0.2em] text-slate-300 text-xl">
            {showEng && "Recent Calls"}
            {showEng && showUrdu && " / "}
            {showUrdu && "حالیہ ٹوکن"}
          </h3>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-6 relative">
           {tokens.length === 0 ? (
             <div className="absolute inset-0 flex items-center justify-center opacity-20">
               <Icons.History className="w-40 h-40" />
             </div>
           ) : (
             tokens.map((token, idx) => <SessionCard key={`${token.id}-${idx}`} token={token} />)
           )}
        </div>
    </div>
  );
};

const PulseCard: React.FC<{ group: any }> = ({ group }) => {
    let borderColor = 'border-slate-700';
    let textColor = 'text-slate-400';
    
    if (!group.isOffline) {
        if (group.waiting > 10) { borderColor = 'border-rose-500'; textColor = 'text-rose-400'; }
        else if (group.waiting > 5) { borderColor = 'border-amber-500'; textColor = 'text-amber-400'; }
        else { borderColor = 'border-emerald-500'; textColor = 'text-emerald-400'; }
    }

    return (
        <div className={`relative overflow-hidden rounded-3xl border-l-[12px] bg-slate-800 shadow-md p-6 flex flex-col justify-between h-[16vh] min-h-[140px] ${borderColor}`}>
            <div className="flex justify-between items-start mb-2">
                <div className="max-w-[80%]">
                    {group.displayEng && <h4 className="font-black uppercase leading-none text-slate-200 text-[clamp(1.2rem,2vw,2.5rem)] truncate">{group.name}</h4>}
                    {group.displayUrdu && <h5 className="font-serif leading-none text-slate-400 text-[clamp(1.2rem,1.8vw,2.2rem)] truncate mt-1">{group.nameUrdu}</h5>}
                </div>
                {!group.isOffline && <div className="text-slate-500"><DynamicIcon icon={group.icon} customIcon={group.customIcon} size="2em" /></div>}
            </div>
            
            <div className="flex items-end justify-between mt-auto">
                <div className="flex flex-col">
                    <span className="text-[0.8em] font-bold uppercase text-slate-500 tracking-wider mb-1">Waiting</span>
                    <span className={`font-black leading-none ${textColor} tabular-nums text-[clamp(3rem,5vw,6rem)]`}>
                        {group.waiting}
                    </span>
                </div>
                {!group.isOffline && (
                    <div className="flex flex-col items-end opacity-60">
                        <Icons.Clock className="w-5 h-5 mb-1" />
                        <span className="font-bold text-white text-[1.2em]">{group.avgWait}m</span>
                    </div>
                )}
                {group.isOffline && <span className="bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-lg font-bold uppercase tracking-wider self-end">Closed</span>}
            </div>
        </div>
    );
};

const ClinicPulseSection = React.memo(({ operationalGroups, showEng, showUrdu }: any) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useAutoScroll(scrollRef, 0.4, operationalGroups.length);
    
    return (
      <div className="flex flex-col h-full bg-slate-900/80 rounded-[3rem] border-2 border-white/10 overflow-hidden shadow-2xl backdrop-blur-md">
         <div className="px-8 py-6 bg-slate-800 border-b border-white/10 flex items-center gap-6 shrink-0">
            <Icons.Activity className="text-emerald-500 w-[clamp(2rem,2.5vw,3rem)] h-[clamp(2rem,2.5vw,3rem)]" /> 
            <h3 className="text-slate-300 font-black uppercase tracking-[0.2em] text-[clamp(1.2rem,1.8vw,2rem)]">
                {showEng && "Clinic Status"}
                {showEng && showUrdu && " / "}
                {showUrdu && "کلینک کی صورتحال"}
            </h3>
         </div>
         <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar p-6">
            <div className="grid grid-cols-1 gap-4">
                {operationalGroups.map((group: any, idx: number) => (
                    <PulseCard key={`${group.id}-${idx}`} group={group} />
                ))}
            </div>
         </div>
      </div>
    );
});

interface NowServingProps { 
    ticketNumber?: string; 
    gender?: Gender;
    departmentName?: string; 
    departmentNameUrdu?: string; 
    counterName?: string; 
    deptIcon?: string; 
    deptCustomIcon?: string; 
    groupName?: string; 
    groupNameUrdu?: string;
    groupColor?: string; 
    showUrdu: boolean; 
    displayEng: boolean; 
    displayUrdu: boolean; 
    direction?: Direction;
    isGridMode?: boolean; 
}

const NowServingSection = React.memo(({ ticketNumber, gender, departmentName, departmentNameUrdu, counterName, deptIcon, deptCustomIcon, groupName, groupNameUrdu, groupColor, displayEng, displayUrdu, direction, isGridMode }: NowServingProps) => {
    const [isBlinking, setIsBlinking] = useState(false);
    useEffect(() => { if(ticketNumber) { setIsBlinking(true); const t = setTimeout(() => setIsBlinking(false), 2500); return () => clearTimeout(t); } }, [ticketNumber]);
    
    const isLeft = direction === 'LEFT';
    const isRight = direction === 'RIGHT';
    const isStraight = direction === 'STRAIGHT';

    if (!ticketNumber) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 rounded-[4rem] border-8 border-slate-800 shadow-inner">
                <Icons.MonitorPlay className="w-[15vw] h-[15vw] text-slate-800 mb-12" />
                <p className="text-[5vw] font-black uppercase tracking-[0.2em] text-slate-700">Please Wait</p>
            </div>
        );
    }

    if (isGridMode) {
        // --- VIEW 2: FOCUS GRID CENTER TILE ---
        return (
            <div className={`w-full h-full relative overflow-hidden bg-slate-900 flex flex-col items-center justify-center ${isBlinking ? 'bg-slate-800' : ''}`}>
                <div className={`absolute inset-0 border-[20px] ${isBlinking ? 'border-emerald-500 animate-pulse' : 'border-slate-700'} pointer-events-none z-20`} />
                
                {/* Background Watermark */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.05] pointer-events-none z-0 transform -rotate-12">
                    <DynamicIcon icon={deptIcon} customIcon={deptCustomIcon} size="40vw" />
                </div>

                <div className="relative z-10 flex flex-col items-center w-full h-full justify-between py-[4vh]">
                    {/* Top: Category Badge */}
                    <div className={`flex items-center gap-4 px-8 py-2 rounded-full bg-${groupColor || 'slate'}-900/80 border-2 border-${groupColor || 'slate'}-500/50 backdrop-blur-md`}>
                        <span className={`font-black uppercase text-${groupColor}-100 text-[3vh]`}>{groupName}</span>
                        {groupNameUrdu && <span className={`font-serif text-${groupColor}-300 text-[2.5vh]`}>{groupNameUrdu}</span>}
                    </div>

                    {/* Middle: Token Number */}
                    <div 
                        className={`font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_10px_60px_rgba(0,0,0,0.8)] ${isBlinking ? 'scale-110' : 'scale-100'} transition-transform duration-500`} 
                        style={{ fontSize: 'clamp(10rem, 25vw, 30rem)', textShadow: '0 0 40px rgba(16,185,129,0.2)' }}
                    >
                        {ticketNumber}
                    </div>

                    {/* Bottom: Destination & Direction */}
                    <div className="w-[90%] bg-emerald-600 rounded-[3rem] p-6 flex items-center justify-between shadow-2xl border-4 border-emerald-400/30">
                        {/* Direction Arrow */}
                        <div className="flex items-center gap-4 text-emerald-100 pl-4">
                             {isLeft && <Icons.ArrowLeft className="w-[8vh] h-[8vh] animate-bounce-left" strokeWidth={3} />}
                             {isRight && <Icons.ArrowRight className="w-[8vh] h-[8vh] animate-bounce-right" strokeWidth={3} />}
                             {isStraight && <Icons.ArrowUp className="w-[8vh] h-[8vh] animate-bounce" strokeWidth={3} />}
                             <div className="flex flex-col">
                                 <span className="font-black uppercase text-[2vh] tracking-widest opacity-80">
                                     {isLeft ? 'GO LEFT' : isRight ? 'GO RIGHT' : 'STRAIGHT'}
                                 </span>
                                 <span className="font-serif text-[2.5vh] leading-none">
                                     {isLeft ? 'بائیں طرف' : isRight ? 'دائیں طرف' : 'سیدھا'}
                                 </span>
                             </div>
                        </div>

                        {/* Room Name */}
                        <div className="text-right pr-4">
                             <div className="font-black uppercase text-white text-[6vh] leading-none">{counterName}</div>
                             <div className="font-serif text-emerald-200 text-[3vh] mt-1">تشریف لائیں</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 1: STANDARD LAYOUT TILE ---
    return (
      <div className={`w-full h-full relative rounded-[4rem] overflow-hidden shadow-2xl border-[10px] bg-slate-900 flex flex-col ${isBlinking ? 'border-emerald-400 shadow-emerald-900/50' : 'border-slate-700'}`}>
          {/* Background Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.03] pointer-events-none z-0 transform -rotate-12">
              <DynamicIcon icon={deptIcon} customIcon={deptCustomIcon} size="50vw" />
          </div>

          {/* Header */}
          <div className="relative z-10 w-full bg-slate-800/80 backdrop-blur-xl py-[3vh] px-[4vw] flex items-center justify-between border-b border-white/10 shrink-0 h-[18%]">
              <div className="flex flex-col justify-center h-full">
                  {displayEng && <span className="font-black text-white uppercase tracking-tight leading-none" style={{ fontSize: 'clamp(3rem, 5vw, 6rem)' }}>{departmentName}</span>}
                  {displayUrdu && <span className="font-serif text-slate-400 leading-none mt-2" style={{ fontSize: 'clamp(2rem, 4vw, 5rem)' }} dir="rtl">{departmentNameUrdu}</span>}
              </div>
              
              {groupName && (
                  <div className={`flex flex-col items-end justify-center px-8 py-2 rounded-3xl bg-${groupColor || 'slate'}-900/50 border-4 border-${groupColor || 'slate'}-500/30`}>
                      <span className={`font-black uppercase text-${groupColor}-100 text-[1.5vw] leading-tight`}>{groupName}</span>
                      {groupNameUrdu && <span className={`font-serif text-${groupColor}-300 text-[1.2vw] leading-tight`}>{groupNameUrdu}</span>}
                  </div>
              )}
          </div>

          {/* Content Body */}
          <div className="flex-1 flex relative z-10 h-[82%]">
              {/* Left Panel: Direction/Gender */}
              <div className="w-[20%] flex flex-col items-center justify-center border-r border-white/5 bg-black/20">
                  {isLeft ? (
                      <div className="animate-bounce-left flex flex-col items-center text-emerald-400">
                          <Icons.ArrowLeft className="w-[10vw] h-[10vw] drop-shadow-[0_0_30px_rgba(16,185,129,0.4)]" strokeWidth={3} />
                          <span className="font-black text-[2vw] uppercase mt-6 tracking-widest">Go Left</span>
                      </div>
                  ) : (gender && gender !== Gender.NONE) && (
                      <div className={`flex flex-col items-center ${gender === Gender.MALE ? 'text-blue-400' : 'text-pink-400'}`}>
                          {gender === Gender.MALE ? <Icons.Male className="w-[10vw] h-[10vw]" /> : <Icons.Female className="w-[10vw] h-[10vw]" />}
                          <span className="font-black uppercase text-[2.5vw] mt-6 tracking-widest">{gender}</span>
                      </div>
                  )}
              </div>

              {/* Center Panel: Token Number */}
              <div className="flex-1 flex flex-col items-center justify-center relative">
                  <div className="text-[3vw] font-black uppercase text-slate-500 tracking-[0.4em] mb-[2vh]">Token Number</div>
                  <div 
                    className={`font-black text-white leading-none tracking-tighter tabular-nums drop-shadow-[0_10px_60px_rgba(0,0,0,0.8)] ${isBlinking ? 'animate-pulse' : ''}`} 
                    style={{ fontSize: 'clamp(12rem, 25vw, 35rem)', textShadow: '0 0 40px rgba(16,185,129,0.2)' }}
                  >
                      {ticketNumber}
                  </div>
              </div>

              {/* Right Panel: Direction/Counter */}
              <div className="w-[30%] flex flex-col items-center justify-center border-l border-white/5 bg-emerald-900/10">
                  {(isRight || isStraight) ? (
                      <div className="animate-bounce-right flex flex-col items-center text-emerald-400">
                          {isStraight ? <Icons.ArrowUp className="w-[10vw] h-[10vw]" strokeWidth={3} /> : <Icons.ArrowRight className="w-[10vw] h-[10vw]" strokeWidth={3} />}
                          <span className="font-black text-[2vw] uppercase mt-6 tracking-widest">{isStraight ? 'Straight' : 'Go Right'}</span>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center w-full h-full bg-emerald-600 p-6 text-center">
                          <span className="text-[1.5vw] font-bold text-emerald-100 uppercase tracking-widest mb-4 opacity-80">Proceed To</span>
                          <span className="text-[6vw] font-black text-white uppercase leading-[0.9] break-words w-full drop-shadow-md">{counterName}</span>
                          <div className="mt-6 px-8 py-2 bg-black/20 rounded-full">
                              <span className="text-[2vw] font-serif text-emerald-50">تشریف لائیں</span>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    );
});

// --- MAIN PAGE COMPONENT ---

export const Display: React.FC<DisplayProps> = ({ onExit }) => {
  const { state, isNetworkSync } = useQueue();
  const [announcementMsg] = useState("PLEASE REMAIN SEATED UNTIL YOUR NUMBER IS CALLED • KEEP YOUR SLIPS READY • سی ایم ایچ کوئٹہ میں خوش آمدید");
  const showEng = state.systemLanguage !== 'URDU';
  const showUrdu = state.systemLanguage !== 'ENGLISH';
  
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // VIEW MODE STATE
  const [viewMode, setViewMode] = useState<ViewMode>('STANDARD');

  // Exit Gesture
  const [isHolding, setIsHolding] = useState(false);
  const exitTimerRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Auto Start logic
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === 'true') {
          handleStartDisplay();
      }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; try { currentSourceRef.current?.stop(); audioContextRef.current?.close(); } catch(e) {} };
  }, []);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) audioContextRef.current = new AudioContextClass();
        } catch(e) {}
    }
    return audioContextRef.current;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsHolding(true);
    exitTimerRef.current = setTimeout(() => { if (isMounted.current) onExit(); }, 2000);
  };

  const handlePointerUp = () => { clearTimeout(exitTimerRef.current); setIsHolding(false); };

  // Data processing
  const [spotlightToken, setSpotlightToken] = useState<Token | null>(null);
  const maxServedAtRef = useRef<number>(0);

  const servingTokens = useMemo(() => state.tokens.filter(t => t.status === TokenStatus.SERVING).sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0)), [state.tokens]);
  
  useEffect(() => {
      const newest = servingTokens[0];
      if (!newest) { setSpotlightToken(null); return; }
      
      const candidateTime = newest.servedAt || 0;
      if (candidateTime > maxServedAtRef.current) {
          maxServedAtRef.current = candidateTime;
          setSpotlightToken(newest);
      } else {
          setSpotlightToken(prev => (prev && prev.id === newest.id ? newest : null));
      }
  }, [state.tokens]);

  const secondaryServing = useMemo(() => servingTokens.filter(t => t.id !== spotlightToken?.id).slice(0, 15), [servingTokens, spotlightToken]);

  const operationalGroups = useMemo(() => {
    if (state.displayMode === 'DEPARTMENT') {
      return state.departments.filter(d => d.isActive !== false).map(d => {
        const groupTokens = state.tokens.filter(t => t.departmentId === d.id);
        const activeCounters = state.counters.filter(c => c.departmentId === d.id && c.isOnline).length;
        return {
          id: d.id, name: d.name, nameUrdu: d.nameUrdu, icon: d.icon, customIcon: d.customIcon, 
          waiting: groupTokens.filter(t => t.status === TokenStatus.WAITING).length, 
          avgWait: getAvgWait(groupTokens), isOffline: activeCounters === 0, 
          displayEng: d.showEnglish ?? showEng, displayUrdu: d.showUrdu ?? showUrdu
        };
      });
    } else {
      return state.counters.filter(c => c.isOnline).map(c => {
        const d = state.departments.find(dept => dept.id === c.departmentId);
        const groupTokens = state.tokens.filter(t => t.counterId === c.id || (t.departmentId === c.departmentId && t.status === TokenStatus.WAITING));
        return {
          id: c.id, name: c.name, nameUrdu: d?.nameUrdu, icon: d?.icon, customIcon: d?.customIcon,
          waiting: groupTokens.filter(t => t.status === TokenStatus.WAITING).length, 
          avgWait: getAvgWait(state.tokens.filter(t => t.counterId === c.id)), isOffline: false,
          displayEng: d?.showEnglish ?? showEng, displayUrdu: d?.showUrdu ?? showUrdu
        };
      });
    }
  }, [state.displayMode, state.departments, state.counters, state.tokens, showEng, showUrdu]);

  const nowServingProps = useMemo(() => {
      const t = spotlightToken;
      const pg = state.patientGroups?.find(g => g.id === t?.patientGroupId);
      const d = state.departments.find(x => x.id === t?.departmentId);
      const c = state.counters.find(x => x.id === t?.counterId);
      return {
          ticketNumber: t?.ticketNumber, gender: t?.gender, departmentName: d?.name, departmentNameUrdu: d?.nameUrdu, counterName: c?.name,
          deptIcon: d?.icon, deptCustomIcon: d?.customIcon, groupName: pg?.name, groupNameUrdu: pg?.nameUrdu, groupColor: pg?.color, groupIcon: pg?.icon, groupCustomIcon: pg?.customIcon,
          showUrdu, displayEng: d?.showEnglish ?? showEng, displayUrdu: d?.showUrdu ?? showUrdu, direction: c?.direction 
      };
  }, [spotlightToken, state.patientGroups, state.departments, state.counters, showEng, showUrdu]);

  // Audio Logic
  const lastAnnouncedKey = useRef<string>(""); 
  useEffect(() => {
    if (!spotlightToken || !spotlightToken.servedAt || !hasInteracted) return;
    const currentKey = `${spotlightToken.id}_${spotlightToken.servedAt}`;
    
    if (currentKey !== lastAnnouncedKey.current && (Date.now() - spotlightToken.servedAt) < 8000) {
      lastAnnouncedKey.current = currentKey;
      const counterName = state.counters.find(c => c.id === spotlightToken.counterId)?.name || "Counter";
      const ticketFormatted = spotlightToken.ticketNumber.replace(/-/g, ' '); 
      let textParts: string[] = [];
      if (showEng) textParts.push(`Token number ${ticketFormatted}, please proceed to ${counterName}.`);
      if (showUrdu) textParts.push(`ٹکن نمبر ${ticketFormatted}, ${counterName} پر تشریف لائیں`);
      
      const speak = async () => {
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textParts.join('   .   ') }] }],
                config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = getAudioContext();
                if (!ctx) return; 
                if (ctx.state === 'suspended') await ctx.resume();
                if (currentSourceRef.current) { try { currentSourceRef.current.stop(); } catch(e) {} }
                playChime(ctx, ctx.currentTime);
                const buffer = await decodePCM(base64Audio, ctx);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(ctx.currentTime + 0.6);
                currentSourceRef.current = source;
            }
          } catch (e) { console.error("TTS Error", e); }
      };
      setTimeout(speak, 500);
    }
  }, [spotlightToken?.id, spotlightToken?.servedAt, hasInteracted]);

  const handleStartDisplay = () => {
    setHasInteracted(true);
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };

  if (!hasInteracted) {
      return (
          <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center cursor-pointer font-sans" onClick={handleStartDisplay}>
              <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_100px_rgba(16,185,129,0.6)] animate-pulse">
                  <Icons.Play size={80} className="text-white ml-2" />
              </div>
              <h1 className="text-7xl font-black text-white mb-6 uppercase tracking-widest">Start Display</h1>
              <p className="text-slate-400 text-3xl font-bold">Tap anywhere to initialize audio.</p>
          </div>
      );
  }

  // --- GRID MAPPER HELPER ---
  const getGridContent = (index: number) => {
      // 12 Slots for History surrounding the 2x2 Center (Slots 6,7,10,11)
      // Map grid index (0-15) to history array index (0-11)
      // 0,1,2,3 -> 0,1,2,3
      // 4,5 -> 4,5
      // 8,9 -> 6,7
      // 12,13,14,15 -> 8,9,10,11
      let historyIndex = -1;
      if (index <= 3) historyIndex = index;
      else if (index <= 5) historyIndex = index;
      else if (index >= 8 && index <= 9) historyIndex = index - 2;
      else if (index >= 12) historyIndex = index - 4;

      if (historyIndex >= 0 && historyIndex < secondaryServing.length) {
          return <SessionCard token={secondaryServing[historyIndex]} minimal />;
      }
      return null;
  };

  return (
    <div className="h-screen w-screen bg-[#020617] text-white flex flex-col overflow-hidden relative font-sans select-none">
      {/* Offline Banner */}
      {!isNetworkSync && (
        <div className="absolute top-4 right-4 z-50 bg-red-600 text-white px-8 py-2 rounded-full text-2xl font-bold uppercase tracking-wider flex items-center gap-4 shadow-2xl animate-pulse pointer-events-none">
           <Icons.WifiOff size={32} /> Offline Mode
        </div>
      )}

      {/* View Switcher - Hidden in bottom corner */}
      <div className="absolute bottom-20 right-6 z-50 opacity-20 hover:opacity-100 transition-opacity">
          <button 
            onClick={() => setViewMode(viewMode === 'STANDARD' ? 'FOCUS_GRID' : 'STANDARD')}
            className="bg-white/10 hover:bg-white/20 p-4 rounded-full backdrop-blur-md border border-white/10"
          >
             {viewMode === 'STANDARD' ? <Icons.Layout size={24} /> : <Icons.Layers size={24} />}
          </button>
      </div>

      {/* HEADER */}
      <header 
        onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
        className="relative px-[2vw] py-[2vh] flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-white/10 z-20 shrink-0 h-[15vh]"
      >
        <div className={`absolute top-0 left-0 h-2 bg-red-500 z-50 transition-all ease-linear duration-[2000ms] ${isHolding ? 'w-full' : 'w-0'}`} />
        
        <div className="flex items-center gap-[2vw]">
           <div className="h-[10vh] w-[10vh] bg-emerald-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl border border-white/20">
               <Icons.Activity className="text-white w-[6vh] h-[6vh]" />
           </div>
           <div className="flex flex-col justify-center">
              {showEng && <h1 className="font-black tracking-tight text-white uppercase leading-none drop-shadow-lg mb-2" style={{ fontSize: 'clamp(3rem, 5vw, 6rem)' }}>{state.clinicName}</h1>}
              {showUrdu && <h2 className="font-serif text-slate-400 opacity-90 leading-none" style={{ fontSize: 'clamp(2rem, 4vw, 5rem)' }} dir="rtl">{state.clinicNameUrdu}</h2>}
           </div>
        </div>
        <ClockWidget />
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-[2vh] overflow-hidden relative z-10 w-full h-full">
         
         {viewMode === 'STANDARD' ? (
             // --- LAYOUT 1: REFINED STANDARD ---
             // Left: Spotlight (Top 60%) + History (Bottom 40%)
             // Right: Full Height Departments
             <div className="grid grid-cols-12 gap-[3vh] h-full">
                 <div className="col-span-8 flex flex-col gap-[3vh] h-full min-h-0">
                     <div className="flex-[1.5] min-h-0">
                         <NowServingSection {...nowServingProps} />
                     </div>
                     <div className="flex-1 min-h-0">
                         <ActiveSessionsPanel tokens={secondaryServing} showEng={showEng} showUrdu={showUrdu} />
                     </div>
                 </div>
                 <div className="col-span-4 h-full min-h-0">
                     <ClinicPulseSection operationalGroups={operationalGroups} showEng={showEng} showUrdu={showUrdu} />
                 </div>
             </div>
         ) : (
             // --- LAYOUT 2: FOCUS GRID ---
             // 4x4 Grid. Center 2x2 is Spotlight. Surrounding 12 are History.
             <div className="grid grid-cols-4 grid-rows-4 gap-4 h-full w-full">
                 {/* Generate 16 tiles */}
                 {Array.from({ length: 16 }).map((_, idx) => {
                     // Check if this is the Center Block (Index 6, 7, 10, 11 - mapped to a single span)
                     if (idx === 6) {
                         return (
                             <div key="center-stage" className="col-span-2 row-span-2 relative z-20 rounded-[3rem] overflow-hidden border-4 border-emerald-500 shadow-2xl">
                                 <NowServingSection {...nowServingProps} isGridMode={true} />
                             </div>
                         );
                     }
                     // Skip indices covered by the col-span
                     if (idx === 7 || idx === 10 || idx === 11) return null;

                     // Render History Tile
                     return (
                         <div key={idx} className="bg-slate-800 rounded-3xl overflow-hidden border border-white/5 relative opacity-80">
                             {getGridContent(idx)}
                         </div>
                     );
                 })}
             </div>
         )}

      </main>

      {/* TICKER */}
      <footer className="h-[8vh] bg-emerald-700 flex items-center overflow-hidden z-20 shrink-0 border-t-[8px] border-emerald-400/20">
        <div className="bg-[#020617] h-full px-[3vw] flex items-center justify-center font-black uppercase tracking-[0.3em] z-30 shadow-2xl text-emerald-500" style={{ fontSize: 'clamp(1.5rem, 2vh, 3rem)' }}>
          {showEng && "NOTICE"}
          {showEng && showUrdu && " / "}
          {showUrdu && "اعلان"}
        </div>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative h-full bg-[#020617]/60">
           <div className="animate-marquee flex items-center gap-[20vw] py-2 absolute top-0 bottom-0">
              <span className="font-black uppercase tracking-wider text-white drop-shadow-md flex items-center gap-4" style={{ fontSize: 'clamp(2rem, 3vh, 4rem)' }}>
                  {announcementMsg}
              </span>
              <span className="font-black uppercase tracking-wider text-white drop-shadow-md flex items-center gap-4" style={{ fontSize: 'clamp(2rem, 3vh, 4rem)' }}>
                  {announcementMsg}
              </span>
           </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 60s linear infinite; }
        @keyframes pulse-slow { 50% { opacity: .5; } }
        .animate-pulse-slow { animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes bounce-left { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-25%); } }
        .animate-bounce-left { animation: bounce-left 1s infinite; }
        @keyframes bounce-right { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(25%); } }
        .animate-bounce-right { animation: bounce-right 1s infinite; }
      `}</style>
    </div>
  );
};
