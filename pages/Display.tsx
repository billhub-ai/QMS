
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import { TokenStatus, Gender, DisplayMode, Token, AppState, Direction } from '../types';
import * as Icons from '../components/Icons';
import { GoogleGenAI, Modality } from "@google/genai";
import { DynamicIcon } from '../components/Icons';

interface DisplayProps {
  onExit: () => void;
}

const getAvgWait = (tokenList: Token[]) => {
  const servedTokens = tokenList.filter(t => (t.status === TokenStatus.COMPLETED || t.status === TokenStatus.SERVING) && (t.firstServedAt || t.servedAt) && t.createdAt);
  if (servedTokens.length === 0) return 0;
  const totalWait = servedTokens.reduce((acc, t) => {
    const endTime = t.firstServedAt || t.servedAt!;
    return acc + Math.max(0, endTime - t.createdAt);
  }, 0);
  return Math.round(totalWait / servedTokens.length / 60000);
};

const MedicalHeartbeat = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 30" className="text-emerald-500/40 ml-[1vw] w-[4vw] max-w-[60px] h-auto block">
    <path d="M0 15 H30 L35 5 L45 25 L50 15 H100" fill="none" stroke="currentColor" strokeWidth="3" className="animate-[heartbeat_3s_ease-in-out_infinite]" />
  </svg>
);

const ClockWidget = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  const weekday = time.toLocaleDateString('en-US', { weekday: 'long' });
  const day = time.getDate();
  const dayStr = String(day).padStart(2, '0');
  const month = time.toLocaleString('en-US', { month: 'long' });
  const year = time.getFullYear();
  return (
    <div className="flex items-center gap-[2vw] leading-none pointer-events-none">
       <div className="font-medium tracking-tight text-white tabular-nums leading-none filter drop-shadow-lg" style={{ fontSize: 'clamp(1.5rem, 3.5vh, 4rem)' }}>{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}</div>
       <div className="hidden xl:block h-[3vh] w-px bg-white/20" />
       <div className="text-emerald-400 font-medium tracking-wide flex items-center gap-[0.5em] opacity-90" style={{ fontSize: 'clamp(1rem, 2vh, 2.5rem)' }}><Icons.Calendar className="w-[1em] h-[1em]" /><span>{weekday}, {dayStr} {month}, {year}.</span></div>
    </div>
  );
};

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
          pauseTimeout = setTimeout(() => { direction = -1; isPaused = false; }, 3000); 
      }
      else if (direction === -1 && el.scrollTop <= 0) {
          isPaused = true;
          pauseTimeout = setTimeout(() => { direction = 1; isPaused = false; }, 3000); 
      }
      animationId = requestAnimationFrame(scroll);
    };
    animationId = requestAnimationFrame(scroll);
    return () => { cancelAnimationFrame(animationId); clearTimeout(pauseTimeout); };
  }, [ref, speed, dependency]); 
};

// Play a gentle attention chime
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

// Decode PCM audio from base64 (Gemini Format: 24kHz Mono 16-bit LE)
const decodePCM = async (base64: string, ctx: AudioContext) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    
    return buffer;
};

// Active Sessions Panel
const SessionCard: React.FC<{ token: Token }> = ({ token }) => {
  const { state } = useQueue();
  const dept = state.departments.find(d => d.id === token.departmentId);
  const patientGroup = state.patientGroups?.find(g => g.id === token.patientGroupId);

  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl flex items-center gap-4 group hover:border-emerald-500/40 transition-all shadow-lg relative overflow-hidden h-auto py-2 px-4 w-fit max-w-full min-w-0 animate-in fade-in slide-in-from-bottom-2">
        <div className="absolute -right-4 -bottom-6 text-white opacity-[0.05] pointer-events-none rotate-12 z-0">
            <DynamicIcon icon={dept?.icon} customIcon={dept?.customIcon} size={64} />
        </div>
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 z-10" />
        
        <div className="shrink-0 font-black text-white leading-none font-mono tracking-tighter tabular-nums z-10" style={{ fontSize: 'clamp(1.5rem, 3vh, 2.2rem)' }}>
            {token.ticketNumber}
        </div>
        
        <div className="w-px h-8 bg-white/10 shrink-0 z-10" />
        
        <div className="flex flex-col justify-center z-10">
          <div className="font-black text-emerald-100 leading-none uppercase whitespace-nowrap" style={{ fontSize: 'clamp(0.7rem, 1.5vh, 1rem)' }}>
              {state.counters.find(c => c.id === token.counterId)?.name}
          </div>
          <div className="font-bold text-slate-400 uppercase tracking-wide mt-0.5 leading-none opacity-80 whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 1.2vh, 0.8rem)' }}>
              {dept?.name}
          </div>
        </div>

        {patientGroup && (
            <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-${patientGroup.color || 'slate'}-500/20 text-${patientGroup.color || 'slate'}-300 border border-${patientGroup.color || 'slate'}-500/30 ml-1 z-10`}>
                <DynamicIcon icon={patientGroup.icon} customIcon={patientGroup.customIcon} size={20} />
            </div>
        )}
    </div>
  );
};

const ActiveSessionsPanel = ({ tokens, variant = 'bottom', showEng, showUrdu }: { tokens: Token[], variant?: 'sidebar' | 'bottom', showEng: boolean, showUrdu: boolean }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoScroll(scrollRef, 0.4, tokens.length); 
  const count = tokens.length;
  
  const wrapperClass = variant === 'bottom' 
     ? 'w-full h-auto max-h-[30vh] shrink-0' 
     : 'h-full flex-1 min-h-0';

  if (count === 0 && variant === 'bottom') return <div className="transition-all duration-700 h-0 py-0 border-0 opacity-0 margin-0" />;

  return (
    <div className={`bg-slate-900/90 rounded-2xl border border-white/10 flex flex-col shadow-xl transition-all duration-700 ease-in-out ${wrapperClass} opacity-100`}>
        <div className="flex items-center gap-[1vw] mb-[0.5vh] px-4 pt-2 shrink-0">
          <div className="w-[0.8vh] h-[0.8vh] bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
          <h3 className="font-black uppercase tracking-[0.4em] text-slate-400" style={{ fontSize: 'clamp(0.7rem, 1.2vh, 1rem)' }}>
            {showEng && "In Session"}
            {showEng && showUrdu && " / "}
            {showUrdu && "جاری ہے"}
          </h3>
          <div className="h-px bg-white/10 flex-1" />
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 pb-3 scroll-smooth">
           <div className={`flex flex-wrap gap-3 content-start ${variant === 'sidebar' ? 'flex-col' : 'flex-row'}`}>
               {tokens.map((token, idx) => <SessionCard key={`${token.id}-${idx}`} token={token} />)}
           </div>
        </div>
    </div>
  );
};

const CategoryHub = ({ name, nameUrdu, icon, customIcon, color = 'slate' }: any) => {
    return (
        <div className={`flex flex-col items-center justify-center p-[1vh] rounded-[2rem] bg-${color}-900/40 border border-${color}-500/30 backdrop-blur-md shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-700 w-full aspect-square max-w-[20vh] mx-auto`}>
            {/* Tier 1: English Title */}
            <span className={`text-[min(2cqi,2vh)] font-black uppercase tracking-widest text-${color}-100 mb-[0.5vh] leading-none text-center drop-shadow-md`}>
                {name || "General"}
            </span>
            
            {/* Tier 2: Large Icon */}
            <div className={`text-${color}-400 drop-shadow-[0_0_30px_rgba(255,255,255,0.15)] my-[0.5vh] relative flex-1 flex items-center justify-center`}>
                <div className={`absolute inset-0 bg-${color}-500/20 blur-xl rounded-full`} />
                <DynamicIcon icon={icon} customIcon={customIcon} size="8vh" />
            </div>
            
            {/* Tier 3: Urdu Title */}
            <span className={`text-[min(2.5cqi,2.5vh)] font-serif font-bold text-${color}-200 mt-[0.5vh] leading-none text-center drop-shadow-md`}>
                {nameUrdu || "جنرل"}
            </span>
        </div>
    );
};

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
    groupIcon?: string; 
    groupCustomIcon?: string; 
    groupColor?: string; 
    showUrdu: boolean; 
    displayEng: boolean; 
    displayUrdu: boolean; 
    direction?: Direction; 
}

const NowServingSection = React.memo(({ ticketNumber, gender, departmentName, departmentNameUrdu, counterName, deptIcon, deptCustomIcon, groupName, groupNameUrdu, groupIcon, groupCustomIcon, groupColor, displayEng, displayUrdu, direction }: NowServingProps) => {
    const [isBlinking, setIsBlinking] = useState(false);
    useEffect(() => { if(ticketNumber) { setIsBlinking(true); const t = setTimeout(() => setIsBlinking(false), 1600); return () => clearTimeout(t); } }, [ticketNumber]);
    
    // Direction Logic
    const isDirectionActive = direction && direction !== 'NONE';
    const isLeft = direction === 'LEFT';
    const isRight = direction === 'RIGHT';
    const isStraight = direction === 'STRAIGHT';

    return (
      <div className={`flex-[1.5] relative rounded-2xl overflow-hidden shadow-2xl border bg-slate-900 bg-opacity-95 transition-all duration-700 ease-in-out flex flex-col min-h-0 ${isBlinking ? 'border-emerald-400 animate-flash-attention shadow-[0_0_60px_rgba(16,185,129,0.3)]' : 'border-white border-opacity-10'}`} style={{ containerType: 'inline-size' } as any}>
          {ticketNumber ? (
            <div key={ticketNumber} className="w-full h-full relative overflow-hidden flex flex-col items-center justify-between animate-in zoom-in-95 duration-500 min-h-0">
              
              {/* Background Watermark */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-[0.03] pointer-events-none z-0 transform -rotate-12">
                  <DynamicIcon icon={deptIcon} customIcon={deptCustomIcon} size="50cqi" />
              </div>
              
              {/* Top Bar: Dept & Counter */}
              <div className="w-full bg-white/5 backdrop-blur-md border-b border-white/10 py-[1.2vh] flex items-center justify-between px-[2vw] relative z-10 shrink-0">
                  <div className="flex flex-col items-start min-w-0">
                      {displayEng && <span className="font-black text-slate-100 uppercase tracking-wide leading-tight truncate" style={{ fontSize: 'clamp(0.9rem, 2cqi, 2.5vh)' }}>{departmentName}</span>}
                      {displayUrdu && departmentNameUrdu && <span className="font-serif text-slate-300 leading-none mt-0.5 truncate" style={{ fontSize: 'clamp(0.8rem, 1.8cqi, 2.2vh)' }} dir="rtl">{departmentNameUrdu}</span>}
                  </div>
                  <div className="bg-emerald-600 text-white px-[2cqi] py-[0.5vh] rounded-lg shadow-lg border border-emerald-400/30 shrink-0 ml-2">
                      <span className="font-black tracking-tight leading-none uppercase" style={{ fontSize: 'clamp(1.2rem, 2.5cqi, 3.5vh)' }}>{counterName}</span>
                  </div>
              </div>
              
              {/* Main Content Area: 3-Column Grid */}
              <div className="flex-1 w-full flex items-center relative z-20 overflow-hidden min-h-0">
                  
                  {/* LEFT COLUMN (25%) */}
                  <div className="w-[25%] h-full flex flex-col items-center justify-center p-[1vh] min-w-0">
                      {isLeft && (
                          <div className="flex flex-col items-center justify-center animate-pulse drop-shadow-2xl">
                              <span className="text-[min(2cqi,2vh)] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">GO LEFT</span>
                              <Icons.ArrowLeft className="w-[8vh] h-[8vh] text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-bounce-left" strokeWidth={3} />
                              <span className="text-[min(2.5cqi,2.5vh)] font-serif font-bold text-emerald-400 leading-none mt-1 whitespace-nowrap">بائیں جانب</span>
                          </div>
                      )}
                      {(!isLeft && groupName) && (
                          <CategoryHub name={groupName} nameUrdu={groupNameUrdu} icon={groupIcon} customIcon={groupCustomIcon} color={groupColor} />
                      )}
                  </div>

                  {/* CENTER COLUMN (50%) - Token Spotlight */}
                  <div className="flex-1 h-full flex flex-col items-center justify-center relative min-w-0">
                        {/* Token Burst Effect */}
                        <div key={`burst-${ticketNumber}`} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30vh] h-[30vh] bg-emerald-500 bg-opacity-20 blur-[60px] rounded-full animate-burst pointer-events-none mix-blend-screen" />
                        
                        <span className="font-black text-emerald-400 text-opacity-80 uppercase tracking-[0.3em] text-[min(1.8cqi,1.8vh)] mb-[0.5vh]">Token Number</span>
                        
                        {/* Huge Token Number - Tuned down to prevent clipping */}
                        <span 
                            className="font-black text-white leading-none tracking-tighter tabular-nums font-mono text-center whitespace-nowrap drop-shadow-2xl z-20" 
                            style={{ 
                                fontSize: 'min(25cqi, 35vh)', 
                                animation: isBlinking ? 'text-blink 0.5s ease-in-out 3' : 'neon-pulse 3s ease-in-out infinite alternate' 
                            }}
                        >
                            {ticketNumber}
                        </span>
                        
                        {/* Gender Identification */}
                        {gender && gender !== Gender.NONE && (
                            <div className={`mt-[1vh] flex items-center gap-[1.5cqi] px-[3cqi] py-[1vh] rounded-full bg-slate-900/80 backdrop-blur-md border shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500 ${gender === Gender.MALE ? 'border-blue-500/50 text-blue-200' : 'border-pink-500/50 text-pink-200'}`}>
                                {gender === Gender.MALE ? <Icons.Male className="w-[2.5vh] h-[2.5vh]" /> : <Icons.Female className="w-[2.5vh] h-[2.5vh]" />}
                                <div className="flex items-center gap-2">
                                    <span className="text-[min(1.8cqi,1.8vh)] font-black uppercase tracking-widest">{gender === Gender.MALE ? 'MALE' : 'FEMALE'}</span>
                                    <span className="text-[min(2cqi,2vh)] font-serif opacity-80">{gender === Gender.MALE ? 'مرد' : 'خاتون'}</span>
                                </div>
                            </div>
                        )}
                  </div>

                  {/* RIGHT COLUMN (25%) */}
                  <div className="w-[25%] h-full flex flex-col items-center justify-center p-[1vh] min-w-0">
                      {(isRight || isStraight) && (
                          <div className="flex flex-col items-center justify-center animate-pulse drop-shadow-2xl">
                              <span className="text-[min(2cqi,2vh)] font-black text-emerald-400 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">
                                  {isStraight ? 'STRAIGHT' : 'GO RIGHT'}
                              </span>
                              {isStraight ? (
                                  <Icons.ArrowUp className="w-[8vh] h-[8vh] text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-bounce" strokeWidth={3} />
                              ) : (
                                  <Icons.ArrowRight className="w-[8vh] h-[8vh] text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.8)] animate-bounce-right" strokeWidth={3} />
                              )}
                              <span className="text-[min(2.5cqi,2.5vh)] font-serif font-bold text-emerald-400 leading-none mt-1 whitespace-nowrap">
                                  {isStraight ? 'سیدھا جائیں' : 'دائیں جانب'}
                              </span>
                          </div>
                      )}
                      {(isLeft && groupName) && (
                          <CategoryHub name={groupName} nameUrdu={groupNameUrdu} icon={groupIcon} customIcon={groupCustomIcon} color={groupColor} />
                      )}
                  </div>
              </div>
            </div>
          ) : (<div className="w-full h-full flex flex-col items-center justify-center text-slate-600"><Icons.MonitorPlay size={80} className="mb-4 opacity-20" /><p className="text-3xl font-black uppercase tracking-[0.2em] opacity-30">System Standby</p></div>)}
      </div>
    );
});

// Clinic Pulse Section
const ClinicPulseSection = React.memo(({ operationalGroups, maxWaiting, showEng, showUrdu }: any) => {
    const pulseScrollRef = useRef<HTMLDivElement>(null);
    useAutoScroll(pulseScrollRef, 0.6, operationalGroups.length);
    return (
      <div className="flex-1 flex flex-col bg-slate-900/90 rounded-2xl border border-white/10 overflow-hidden shadow-2xl min-h-0">
         <div className="p-[1.5vh] border-b border-white/10 shrink-0 bg-slate-900/40 flex items-center justify-between">
            <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-2" style={{ fontSize: 'clamp(0.7rem, 1.2vh, 1rem)' }}><Icons.Activity className="w-[1.8vh] h-[1.8vh] text-emerald-500" /> {showEng && "Clinic Pulse"}{showEng && showUrdu && " / "}{showUrdu && "کلینک کی صورتحال"}</h3>
            <div className="flex gap-2 text-[9px] font-bold uppercase tracking-wider text-slate-500"><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Normal</span><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Busy</span><span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> High</span></div>
         </div>
         <div ref={pulseScrollRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth p-[1vh]">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[1vh]">
                {operationalGroups.map((group: any, idx: number) => {
                  const loadPercent = Math.min(100, (group.waiting / maxWaiting) * 100);
                  let loadColor = 'emerald'; if (group.waiting > 5) loadColor = 'amber'; if (group.waiting > 15) loadColor = 'rose'; if (group.isOffline) loadColor = 'slate';
                  return (
                    <div key={`${group.id}-${idx}`} className={`relative overflow-hidden rounded-xl border transition-all duration-500 flex flex-col shadow-lg group ${group.isOffline ? 'bg-slate-900 bg-opacity-60 border-slate-700 opacity-60' : `bg-white bg-opacity-5 border-${loadColor}-500 border-opacity-30 hover:bg-white hover:bg-opacity-10`}`}>
                        <div className={`absolute -right-[2vh] -bottom-[2vh] opacity-10 transform rotate-12 transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6 text-${loadColor}-400`}>
                            <DynamicIcon icon={group.icon} customIcon={group.customIcon} size="12vh" />
                        </div>
                        {loadColor === 'rose' && !group.isOffline && (<div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.6)]" />)}
                        <div className="p-[1vh] flex flex-col h-full relative z-10 min-h-[90px]">
                            <div className="flex items-start justify-between mb-1 gap-2"><div className="flex items-stretch gap-2 min-w-0 flex-1"><div className={`rounded-lg ${group.isOffline ? 'bg-slate-800 text-slate-500' : `bg-${loadColor}-500 bg-opacity-20 text-${loadColor}-300`} shrink-0 flex items-center justify-center aspect-square w-auto min-h-[6vh] p-1`}>
                                <DynamicIcon icon={group.icon} customIcon={group.customIcon} size="70%" />
                            </div><div className="flex flex-col justify-center min-w-0 py-0.5">{group.displayEng && <h4 className={`font-black text-white uppercase tracking-tight leading-none truncate ${group.isOffline ? 'text-slate-400' : ''}`} style={{ fontSize: 'clamp(0.8rem, 1.2vw, 1.2rem)' }}>{group.name}</h4>}{group.displayUrdu && group.nameUrdu && <h5 className={`font-serif leading-none mt-0.5 truncate ${group.isOffline ? 'text-slate-500' : 'text-slate-300'}`} style={{ fontSize: 'clamp(0.8rem, 1.1vw, 1.1rem)' }}>{group.nameUrdu}</h5>}</div></div>{group.isOffline && <span className="self-center px-1 py-0.5 rounded-sm bg-slate-800 text-slate-400 text-[8px] font-black uppercase tracking-widest border border-slate-700 shrink-0">Closed</span>}</div>
                            <div className="flex-1 flex items-end justify-between gap-2 mt-1"><div className="flex items-end gap-2"><span className={`font-black leading-none tracking-tighter tabular-nums text-${loadColor}-400`} style={{ fontSize: 'clamp(2rem, 3vw, 3rem)', textShadow: `0 0 20px var(--tw-color-${loadColor}-500)` }}>{group.waiting}</span><div className="flex flex-col mb-1 gap-0.5"><Icons.Users className={`text-${loadColor}-500 opacity-50`} style={{ width: 'clamp(1.2rem, 1.5vw, 1.8rem)', height: 'clamp(1.2rem, 1.5vw, 1.8rem)' }} /><span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none">Waiting</span></div></div>{!group.isOffline && (<div className="flex flex-col items-end mb-0.5 opacity-90"><div className="flex items-end gap-1 text-white"><Icons.Clock className={`text-${loadColor}-400 mb-0.5`} style={{ width: 'clamp(1rem, 2vh, 1.5rem)', height: 'clamp(1rem, 2vh, 1.5rem)' }} /><span className="font-black tabular-nums leading-none" style={{ fontSize: 'clamp(1.5rem, 2.5vh, 2.5rem)' }}>{group.avgWait}m</span></div><span className="font-bold uppercase tracking-wider text-slate-500 mt-0.5" style={{ fontSize: 'clamp(0.5rem, 1vh, 0.8rem)' }}>Avg Wait</span></div>)}</div>
                            {!group.isOffline && (<div className="w-full h-1 bg-white bg-opacity-10 rounded-full mt-1 overflow-hidden"><div className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-${loadColor}-600 to-${loadColor}-400`} style={{ width: `${Math.max(5, loadPercent)}%` }} /></div>)}
                        </div>
                    </div>
                  );
                })}
            </div>
         </div>
      </div>
    );
});

export const Display: React.FC<DisplayProps> = ({ onExit }) => {
  const { state, isNetworkSync } = useQueue();
  const [announcementMsg, setAnnouncementMsg] = useState("PLEASE REMAIN SEATED UNTIL YOUR NUMBER IS CALLED • KEEP YOUR SLIPS READY • سی ایم ایچ کوئٹہ میں خوش آمدید");
  const showEng = state.systemLanguage !== 'URDU';
  const showUrdu = state.systemLanguage !== 'ENGLISH';
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const exitTimerRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Check URL params for autostart & Audio Resume
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const attemptAutoResume = async () => {
          try {
              const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  if (ctx.state === 'suspended') await ctx.resume();
                  if (ctx.state === 'running') setHasInteracted(true);
                  ctx.close();
              }
          } catch(e) { console.log("Auto-audio resume failed"); }
      };

      if (params.get('autostart') === 'true') {
          handleStartDisplay();
      } else {
          attemptAutoResume();
      }
  }, []);

  // Re-implementing essential audio logic
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; try { if(currentSourceRef.current) currentSourceRef.current.stop(); if(audioContextRef.current) audioContextRef.current.close(); } catch(e) {} };
  }, []);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return null;
            audioContextRef.current = new AudioContextClass();
        } catch(e) { return null; }
    }
    return audioContextRef.current;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (exitTimerRef.current) return;
    setIsHolding(true);
    exitTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(200); 
      exitTimerRef.current = null;
      if (isMounted.current) onExit(); 
    }, 2000);
  };

  const handlePointerUp = () => { if (exitTimerRef.current) { clearTimeout(exitTimerRef.current); exitTimerRef.current = null; } setIsHolding(false); };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onExit(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  // --- SPOTLIGHT FRESHNESS LOGIC ---
  const [spotlightToken, setSpotlightToken] = useState<Token | null>(null);
  const maxServedAtRef = useRef<number>(0);

  const servingTokens = useMemo(() => state.tokens.filter(t => t.status === TokenStatus.SERVING).sort((a, b) => (b.servedAt || 0) - (a.servedAt || 0)), [state.tokens]);
  
  useEffect(() => {
      const candidate = servingTokens[0];
      if (!candidate) {
          setSpotlightToken(null);
          return;
      }
      
      const candidateTime = candidate.servedAt || 0;
      
      // If this token is newer than anything we've shown before, show it.
      if (candidateTime > maxServedAtRef.current) {
          maxServedAtRef.current = candidateTime;
          setSpotlightToken(candidate);
      } else {
          // It's older or same. 
          // Only show if it's the SAME token we are already showing (stable).
          // If the top token is an old one (e.g. newer one completed), we hide spotlight.
          setSpotlightToken(prev => (prev && prev.id === candidate.id ? candidate : null));
      }
  }, [servingTokens]);

  const secondaryServing = useMemo(() => {
      return servingTokens.filter(t => t.id !== spotlightToken?.id).slice(0, 25);
  }, [servingTokens, spotlightToken]);

  // Mapped for NowServingSection
  const currentToken = spotlightToken;

  const operationalGroups = useMemo(() => {
    if (state.displayMode === 'DEPARTMENT') {
      return state.departments.filter(d => d.isActive !== false).map(d => {
        const groupTokens = state.tokens.filter(t => t.departmentId === d.id);
        const activeCounters = state.counters.filter(c => c.departmentId === d.id && c.isOnline).length;
        const isOffline = activeCounters === 0;
        return {
          id: d.id, name: d.name, nameUrdu: d.nameUrdu, icon: d.icon, customIcon: d.customIcon, color: isOffline ? 'slate' : (d.color || 'blue'),
          waiting: groupTokens.filter(t => t.status === TokenStatus.WAITING).length, avgWait: getAvgWait(groupTokens), isOffline, displayEng: d.showEnglish ?? showEng, displayUrdu: d.showUrdu ?? showUrdu
        };
      });
    } else {
      return state.counters.filter(c => c.isOnline).map(c => {
        const d = state.departments.find(dept => dept.id === c.departmentId);
        const groupTokens = state.tokens.filter(t => t.counterId === c.id || (t.departmentId === c.departmentId && t.status === TokenStatus.WAITING));
        return {
          id: c.id, name: c.name, nameUrdu: d?.nameUrdu, icon: d?.icon, customIcon: d?.customIcon, color: d?.color || 'blue',
          waiting: groupTokens.filter(t => t.status === TokenStatus.WAITING).length, avgWait: getAvgWait(state.tokens.filter(t => t.counterId === c.id)), isOffline: false, displayEng: d?.showEnglish ?? showEng, displayUrdu: d?.showUrdu ?? showUrdu
        };
      });
    }
  }, [state.displayMode, state.departments, state.counters, state.tokens, showEng, showUrdu]);

  const maxWaiting = useMemo(() => Math.max(...operationalGroups.map(g => g.waiting), 1), [operationalGroups]);

  const nowServingProps = useMemo(() => {
      const patientGroup = state.patientGroups?.find(g => g.id === currentToken?.patientGroupId);
      const dept = state.departments.find(d => d.id === currentToken?.departmentId);
      const counter = state.counters.find(c => c.id === currentToken?.counterId);
      return {
          ticketNumber: currentToken?.ticketNumber, gender: currentToken?.gender, departmentName: dept?.name, departmentNameUrdu: dept?.nameUrdu, counterName: counter?.name,
          deptIcon: dept?.icon, deptCustomIcon: dept?.customIcon, groupName: patientGroup?.name, groupNameUrdu: patientGroup?.nameUrdu, groupColor: patientGroup?.color, groupIcon: patientGroup?.icon, groupCustomIcon: patientGroup?.customIcon,
          showUrdu: showUrdu, displayEng: dept?.showEnglish ?? showEng, displayUrdu: dept?.showUrdu ?? showUrdu, direction: counter?.direction 
      };
  }, [currentToken, state.patientGroups, state.departments, state.counters, showEng, showUrdu]);

  // Audio Announcer (Gemini Logic)
  const lastAnnouncedKey = useRef<string>(""); 
  
  useEffect(() => {
    // Only announce if spotlight is active
    if (!currentToken || !currentToken.servedAt || !hasInteracted) return;
    
    // Composite Key allows recall announcements (ID + Timestamp)
    const currentKey = `${currentToken.id}_${currentToken.servedAt}`;
    const isRecent = (Date.now() - currentToken.servedAt) < 8000;
    
    if (currentKey !== lastAnnouncedKey.current && isRecent) {
      lastAnnouncedKey.current = currentKey;
      
      const counterName = state.counters.find(c => c.id === currentToken.counterId)?.name || "Counter";
      const ticketFormatted = currentToken.ticketNumber.replace(/-/g, ' '); 
      let textParts: string[] = [];
      if (showEng) textParts.push(`Token number ${ticketFormatted}, please proceed to ${counterName}.`);
      if (showUrdu) textParts.push(`ٹکن نمبر ${ticketFormatted}, ${counterName} پر تشریف لائیں`);
      if (textParts.length === 0) return;
      const textToSpeak = textParts.join('   .   '); 

      const speak = async () => {
          try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: textToSpeak }] }],
                config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const ctx = getAudioContext();
                if (!ctx) return; 
                if (ctx.state === 'suspended') await ctx.resume();
                if (currentSourceRef.current) { try { currentSourceRef.current.stop(); currentSourceRef.current.disconnect(); } catch(e) {} }
                playChime(ctx, ctx.currentTime);
                const buffer = await decodePCM(base64Audio, ctx);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(ctx.currentTime + 0.6);
                currentSourceRef.current = source;
            }
          } catch (e) { console.error("Gemini TTS failed", e); }
      };
      const t = setTimeout(speak, 500);
      return () => clearTimeout(t);
    }
  }, [currentToken?.id, currentToken?.servedAt, showEng, showUrdu, hasInteracted]);

  const handleStartDisplay = () => {
    setHasInteracted(true);
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };

  const isSidebarMode = secondaryServing.length > 0 && secondaryServing.length <= 4;

  if (!hasInteracted) {
      return (
          <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in cursor-pointer" onClick={handleStartDisplay}>
              <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(16,185,129,0.5)] animate-pulse"><Icons.Play size={48} className="text-white ml-2" /></div>
              <h1 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-widest">Start Display</h1>
              <p className="text-slate-400 text-lg md:text-xl font-medium max-w-lg">Click anywhere to enable audio announcements and start the queue display.</p>
          </div>
      );
  }

  return (
    <div className="h-full bg-[#020617] text-white flex flex-col overflow-hidden relative font-sans selection:bg-emerald-500/30">
      
      {/* Sync Status Indicator */}
      {!isNetworkSync && (
        <div className="absolute top-2 right-2 z-50 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg animate-pulse pointer-events-none">
           <Icons.WifiOff size={14} /> Reconnecting...
        </div>
      )}

      <header 
        onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
        className="relative px-[2vw] py-[1vh] flex justify-between items-center bg-slate-900/90 backdrop-blur-md border-b border-white/5 z-20 shrink-0 h-[12vh] min-h-[80px] cursor-pointer select-none active:bg-slate-800/50 transition-colors overflow-hidden"
      >
        <div className={`absolute top-0 left-0 h-2 bg-red-500 z-50 transition-all ease-linear duration-[2000ms] ${isHolding ? 'w-full' : 'w-0'}`} />
        <div className="flex items-center gap-1.5vw">
           <div className="h-[8vh] w-[8vh] min-h-[48px] bg-emerald-600 rounded-lg flex items-center justify-center shadow-2xl border border-white/20 hover:scale-105 active:scale-95 transition-transform cursor-pointer"><Icons.Activity className="text-white w-1/2 h-1/2" /></div>
           <div>
              {showEng && <h1 className="font-black tracking-tight text-white uppercase flex items-center gap-[0.5vw] drop-shadow-md leading-none whitespace-nowrap" style={{ fontSize: 'clamp(2rem, 4vh, 6rem)' }}>{state.clinicName}<MedicalHeartbeat /></h1>}
              {showUrdu && <h2 className="font-serif text-slate-400 mt-[0.5vh] opacity-90 leading-none" style={{ fontSize: 'clamp(1.5rem, 3vh, 4rem)' }} dir="rtl">{state.clinicNameUrdu}</h2>}
           </div>
        </div>
        <ClockWidget />
      </header>

      <main className="flex-1 px-[2vw] py-[0.5vh] overflow-hidden relative z-10 w-full">
         {isSidebarMode ? (
            <div className="flex h-full gap-[1vw]">
                <div className="flex-1 flex flex-col gap-[2vh] min-w-0 h-full">
                    <NowServingSection {...nowServingProps} />
                    <ActiveSessionsPanel tokens={secondaryServing} variant="sidebar" showEng={showEng} showUrdu={showUrdu} />
                </div>
                <div className="flex-1 h-full min-w-0 flex flex-col">
                    <ClinicPulseSection operationalGroups={operationalGroups} maxWaiting={maxWaiting} showEng={showEng} showUrdu={showUrdu} />
                </div>
            </div>
         ) : (
            <div className="flex flex-col h-full gap-[1vh]">
                <div className="flex-1 flex gap-[1vw] min-h-0">
                   <NowServingSection {...nowServingProps} />
                   <ClinicPulseSection operationalGroups={operationalGroups} maxWaiting={maxWaiting} showEng={showEng} showUrdu={showUrdu} />
                </div>
                <ActiveSessionsPanel tokens={secondaryServing} variant="bottom" showEng={showEng} showUrdu={showUrdu} />
            </div>
         )}
      </main>

      <footer className="h-[6vh] min-h-[40px] bg-emerald-700 flex items-center overflow-hidden z-20 shrink-0 border-t-4 border-emerald-400/30">
        <div className="bg-[#020617] h-full px-[2vw] flex items-center justify-center font-black uppercase tracking-[0.4em] z-30" style={{ fontSize: 'clamp(1rem, 2vh, 1.8rem)' }}>
          {showEng && "Updates"}
          {showEng && showUrdu && " / "}
          {showUrdu && "تازہ ترین"}
        </div>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative h-full bg-[#020617]/20">
           <div className="animate-marquee flex items-center gap-[20vw] py-2 absolute top-0 bottom-0">
              <span className="font-black uppercase tracking-wider text-white" style={{ fontSize: 'clamp(1.5rem, 3vh, 2.5rem)' }}>{announcementMsg}</span>
              <span className="font-black uppercase tracking-wider text-white" style={{ fontSize: 'clamp(1.5rem, 3vh, 2.5rem)' }}>{announcementMsg}</span>
           </div>
        </div>
      </footer>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 50s linear infinite; }
        @keyframes neon-pulse { from { text-shadow: 0 0 10px rgba(16,185,129,0.2); } to { text-shadow: 0 0 30px rgba(16,185,129,0.8); } }
        @keyframes burst { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
        .animate-burst { animation: burst 1s ease-out forwards; }
        @keyframes flash-attention { 
            0% { border-color: rgba(255,255,255,0.1); box-shadow: 0 0 0 rgba(16,185,129,0); background-color: rgba(15, 23, 42, 0.6); } 
            50% { border-color: #34d399; box-shadow: 0 0 50px rgba(52, 211, 153, 0.4); background-color: rgba(6, 78, 59, 0.4); } 
            100% { border-color: rgba(255,255,255,0.1); box-shadow: 0 0 0 rgba(16,185,129,0); background-color: rgba(15, 23, 42, 0.6); } 
        }
        .animate-flash-attention { animation: flash-attention 1s ease-in-out infinite; }
        @keyframes text-blink { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.2; transform: scale(0.95); } }
        @keyframes bounce-left { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-20%); } }
        .animate-bounce-left { animation: bounce-left 1s infinite; }
        @keyframes bounce-right { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(20%); } }
        .animate-bounce-right { animation: bounce-right 1s infinite; }
      `}</style>
    </div>
  );
};
