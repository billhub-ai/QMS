
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQueue } from '../context/QueueContext';
import * as Icons from '../components/Icons';
import { Gender, TokenStatus, ReceptionCard, PatientGroup, Counter } from '../types';

const ICON_MAP: Record<string, any> = {
  'ct': Icons.CTIcon,
  'mri': Icons.MRIIcon,
  'ultrasound': Icons.UltrasoundIcon,
  'fetus': Icons.FetusIcon,
  'mammography': Icons.MammographyIcon,
  'breast': Icons.BreastIcon,
  'radiology': Icons.Radiation,
  'scan': Icons.Scan, // Fallback/Legacy
  'stethoscope': Icons.Stethoscope,
  'heart-pulse': Icons.HeartPulse,
  'baby': Icons.Baby,
  'eye': Icons.Eye,
  'bone': Icons.Bone,
  'brain': Icons.BrainCircuit,
  'medical': Icons.BriefcaseMedical,
  'star': Icons.Star
};

const COLORS: string[] = ['emerald', 'blue', 'indigo', 'purple', 'pink', 'rose', 'orange', 'amber', 'lime', 'teal', 'slate'];

export const Reception: React.FC = () => {
  const { state, addToken, setDeviceRole, addReceptionCard, updateReceptionCard, removeReceptionCard, removeReceptionCards, reorderReceptionCards, updatePrintSettings, updateClinicDetails, addCounter } = useQueue();
  const { printSettings } = state;
  const [lastToken, setLastToken] = useState<{ number: string, dept: string, group: string, time: string, color: string } | null>(null);
  const [showPrintFeedback, setShowPrintFeedback] = useState(false); // New State for Toast
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Edit Mode States
  const [isReceptionEditMode, setIsReceptionEditMode] = useState(false);
  const [editingCard, setEditingCard] = useState<ReceptionCard | null>(null); // For Modal
  const [showReceiptDesigner, setShowReceiptDesigner] = useState(false); // For Receipt Modal
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  
  // Confirmation States
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingUnlinkId, setConfirmingUnlinkId] = useState<string | null>(null);
  
  // Selection State for Multi-Category Cards
  const [cardForSelection, setCardForSelection] = useState<{ card: ReceptionCard, label: string } | null>(null);

  // Linking State
  const [linkingSourceId, setLinkingSourceId] = useState<string | null>(null);
  const [linkingHoverTargetId, setLinkingHoverTargetId] = useState<string | null>(null);

  // Gesture State
  const longPressTimer = useRef<number | null>(null);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-launch Secondary Display Logic (Waiting Hall)
  useEffect(() => {
      const shouldAutoLaunch = localStorage.getItem('zenqueue_dual_screen') === 'true';
      // Check session storage to avoid spamming windows on refresh
      const hasLaunched = sessionStorage.getItem('reception_display_launched');
      
      if (shouldAutoLaunch && !hasLaunched) {
          const width = window.screen.width;
          const left = width; 
          
          window.open(
              `${window.location.origin}${window.location.pathname}?view=display&autostart=true`, 
              'SecondaryDisplay_Main', 
              `left=${left},top=0,width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no`
          );
          sessionStorage.setItem('reception_display_launched', 'true');
      }
  }, []);

  // Grand Stats
  const grandStats = useMemo(() => {
    const allTokens = state.tokens;
    return {
      total: allTokens.length,
      waiting: allTokens.filter(t => t.status === TokenStatus.WAITING).length,
      served: allTokens.filter(t => t.status === TokenStatus.COMPLETED).length
    };
  }, [state.tokens]);

  // Department Stats - Dynamic Calculation based on Active Departments
  const deptStats = useMemo(() => {
    return state.departments
      .filter(d => d.isActive !== false)
      .map(dept => {
        const allTokens = state.tokens.filter(t => t.departmentId === dept.id);
        
        // Smart Label Logic: Prefer Short Codes/Forms
        let label = dept.prefix || "";
        const n = dept.name.toUpperCase();

        if (n.includes('MAMMOGRAM') || n.includes('MAMMOGRAPHY')) label = 'MAMMO';
        else if (n.includes('ULTRASOUND')) label = 'USG';
        else if (n.includes('X-RAY')) label = 'X-RAY';
        else if (n.includes('CT SCAN')) label = 'CT';
        else if (n.includes('MRI')) label = 'MRI';
        else if (label.length === 0 || label.length > 6) {
            // If prefix is missing or too long, derive from name
            label = dept.name.replace(/\s+(Department|Clinic|Center|Centre)$/i, '').substring(0, 8);
        }
        
        return {
          id: dept.id,
          label: label.toUpperCase(), 
          fullLabel: dept.name,
          color: dept.color || 'slate',
          icon: dept.icon,
          total: allTokens.length,
          waiting: allTokens.filter(t => t.status === TokenStatus.WAITING).length,
          served: allTokens.filter(t => t.status === TokenStatus.COMPLETED).length
        };
      });
  }, [state.tokens, state.departments]);

  const cards: ReceptionCard[] = state.receptionCards || [];

  // Determine grid columns based on card count to fit screen
  const gridCols = useMemo(() => {
    const count = cards.length;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 12) return 4;
    if (count > 20) return 6;
    return 5;
  }, [cards.length]);

  const gridStyle = useMemo(() => {
    return { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` };
  }, [gridCols]);

  // Prepare Display Items (Grouping logic for View Mode)
  const displayItems: { type: 'single' | 'merged', cards: ReceptionCard[], id: string, index: number }[] = useMemo(() => {
    if (isReceptionEditMode) {
      return cards.map((c, index) => ({ type: 'single' as const, cards: [c], id: c.id, index }));
    }

    const items: { type: 'single' | 'merged', cards: ReceptionCard[], id: string, index: number }[] = [];
    const processedKeys = new Set<string>();

    cards.forEach((card, index) => {
      // If sequenceKey is missing, we don't merge. Treat as independent button that likely points to global pool.
      if (!card.sequenceKey || card.sequenceKey.trim() === '') {
          items.push({ type: 'single', cards: [card], id: card.id, index });
          return;
      }

      if (processedKeys.has(card.sequenceKey)) return;
      const linked = cards.filter(c => c.sequenceKey === card.sequenceKey);

      if (linked.length > 1) {
        items.push({ type: 'merged', cards: linked, id: `merged_${card.sequenceKey}`, index });
        processedKeys.add(card.sequenceKey);
      } else {
        items.push({ type: 'single', cards: [card], id: card.id, index });
        processedKeys.add(card.sequenceKey);
      }
    });

    return items;
  }, [cards, isReceptionEditMode]);

  const getNextTokenNumber = (deptId: string, gender: Gender, sequenceKey?: string) => {
    let tokens = state.tokens.filter(t => t.departmentId === deptId);
    
    // Strict Sequence Logic: If sequenceKey exists, filter ONLY by that key.
    // This decouples queue logic from Dept ID if needed (for independent rooms).
    if (sequenceKey && sequenceKey.trim() !== '') {
        tokens = state.tokens.filter(t => t.sequenceKey === sequenceKey);
    } else {
        // Fallback: Gender separated department logic
        const dept = state.departments.find(d => d.id === deptId);
        if (!dept) return "---";
        const useSeparateSequence = dept.isGenderSeparated && dept.hasSeparateGenderTokenSequences && gender !== Gender.NONE;
        if (useSeparateSequence) tokens = tokens.filter(t => t.gender === gender);
    }
    const lastNum = tokens.length > 0 ? Math.max(...tokens.map(t => t.rawNumber)) : 0;
    return String(lastNum + 1).padStart(3, '0');
  };

  const getWaitingCount = (deptId: string, gender: Gender, sequenceKey?: string) => {
      let tokens = state.tokens.filter(t => t.departmentId === deptId && t.status === TokenStatus.WAITING);
      
      if (sequenceKey && sequenceKey.trim() !== '') {
          // Count waiting tokens specifically for this sequence
          tokens = state.tokens.filter(t => t.sequenceKey === sequenceKey && t.status === TokenStatus.WAITING);
      } else {
          const dept = state.departments.find(d => d.id === deptId);
          if (dept) {
              const useSeparateSequence = dept.isGenderSeparated && dept.hasSeparateGenderTokenSequences && gender !== Gender.NONE;
              if (useSeparateSequence) tokens = tokens.filter(t => t.gender === gender);
          }
      }
      return tokens.length;
  };

  const getGenderDisplay = (gender: Gender) => {
    switch (gender) {
        case Gender.MALE: return { symbol: '♂', color: 'text-blue-600' };
        case Gender.FEMALE: return { symbol: '♀', color: 'text-pink-600' };
        default: return { symbol: '⚥', color: 'text-slate-500' };
    }
  };

  const handleIssueToken = (card: ReceptionCard, specificGroupId?: string, customLabel?: string) => {
    if (isReceptionEditMode || !card.isActive) return;

    // Safety: Ensure Department Exists to prevent uncaught error in addToken
    const deptExists = state.departments.some(d => d.id === card.deptId);
    if (!deptExists) {
        alert("This card is linked to a missing department. Please edit the card.");
        return;
    }

    const effectiveLabel = customLabel || card.label;

    // Logic: If multiple groups OR NO GROUPS (General) are configured, show modal
    if (!specificGroupId) {
       // Check if categories are "General" (empty array) OR "Multiple"
       const isGeneral = !card.patientGroupIds || card.patientGroupIds.length === 0;
       const hasMultiple = card.patientGroupIds && card.patientGroupIds.length > 1;
       
       if (isGeneral || hasMultiple) {
           setCardForSelection({ card, label: effectiveLabel });
           return;
       }
       // Auto-select the single group
       specificGroupId = card.patientGroupIds[0];
    }

    try {
        const token = addToken(card.deptId, card.gender, specificGroupId, card.sequenceKey);
        const groupName = state.patientGroups.find(g => g.id === specificGroupId)?.name || 'General';

        setLastToken({ 
          number: token.ticketNumber, 
          dept: effectiveLabel,
          group: groupName,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          color: card.color
        });
        
        // Trigger Print Feedback
        setShowPrintFeedback(true);
        setTimeout(() => setShowPrintFeedback(false), 3000);

        silentPrint(card, token, groupName, effectiveLabel);
        setCardForSelection(null);
    } catch (e) {
        console.error("Token issuance failed", e);
        alert("Failed to issue token. Please check configuration.");
    }
  };

  const silentPrint = (card: ReceptionCard, token: any, groupName: string, printLabel?: string) => {
    setTimeout(() => {
      const printArea = document.getElementById('reception-print-area');
      if (!printArea) return;
      
      const existingIframe = document.getElementById('reception-print-frame');
      if (existingIframe && existingIframe.parentNode) {
        existingIframe.parentNode.removeChild(existingIframe);
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'reception-print-frame';
      // Completely hidden iframe off-screen to avoid visual glitches or dialog flash
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
        const dateStr = new Date().toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        }).replace(/ at /g, ' ');

        const gap = printSettings.lineSpacing;
        const bodyPadding = gap > 2 ? '5mm' : '0mm'; 

        doc.open();
        doc.write(`
          <html>
            <head>
              <style>
                @page { size: 80mm auto; margin: 0; }
                body { 
                    margin: 0;
                    padding: ${bodyPadding} 0; 
                    font-family: 'Courier New', Courier, monospace;
                    text-align: center; 
                    color: black;
                    width: 78mm; 
                }
                h1, h2, h3, h4, p { margin: 0; padding: 0; }
                .clinic-name { 
                    font-size: ${printSettings.clinicNameSize}px; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    letter-spacing: 1px; 
                    margin-bottom: ${Math.max(0, gap)}px;
                }
                .date { 
                    font-size: ${printSettings.dateSize}px; 
                    font-weight: bold; 
                    margin-bottom: ${Math.max(2, gap * 1.5)}px; 
                }
                .service-name { 
                    font-size: ${printSettings.deptNameSize}px; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    margin-top: ${Math.max(2, gap)}px; 
                    letter-spacing: 1px; 
                    line-height: 1;
                }
                .category-name { 
                    font-size: ${Math.max(10, printSettings.deptNameSize * 0.7)}px; 
                    font-weight: 900; 
                    text-transform: uppercase; 
                    margin-top: ${Math.max(0, gap * 0.5)}px; 
                    margin-bottom: ${Math.max(5, gap * 2)}px; 
                }
                .token-label { 
                    font-size: ${printSettings.footerSize}px; 
                    font-weight: bold; 
                    text-transform: uppercase; 
                    letter-spacing: 2px; 
                }
                .token-number { 
                    font-size: ${printSettings.tokenNumberSize}px; 
                    font-weight: 900; 
                    line-height: 1; 
                    margin-top: ${Math.max(0, gap * 0.5)}px;
                    margin-bottom: ${Math.max(2, gap)}px; 
                    font-family: sans-serif; 
                }
              </style>
            </head>
            <body>
               ${printSettings.showClinicName ? `<div class="clinic-name">${state.clinicName}</div>` : ''}
               ${printSettings.showDate ? `<div class="date">${dateStr}</div>` : ''}
               
               <div class="service-name">${printLabel || card.label}</div>
               <div class="category-name">${groupName}</div>
               
               <div class="token-label">TOKEN NO</div>
               <div class="token-number">${token.ticketNumber}</div>
            </body>
          </html>
        `);
        doc.close();
        
        // Print immediately
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Restore focus to main window to prevent "sticky" focus on invisible iframe
        window.focus();

        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
      }
    }, 50);
  };

  // ... (rest of the component unchanged) ...
  // --- Helper to merge titles ---
  const getMergedTitle = (cards: ReceptionCard[]) => {
    const titles = cards.map(c => c.label);
    if (titles.length === 0) return "";
    if (titles.length === 1) return titles[0];

    // Find common prefix
    const splitTitles = titles.map(t => t.split(' '));
    let commonPrefix: string[] = [];
    const first = splitTitles[0];
    
    // Check word by word
    for (let i = 0; i < first.length; i++) {
      const word = first[i];
      if (splitTitles.every(t => t[i] === word)) {
        commonPrefix.push(word);
      } else {
        break;
      }
    }

    if (commonPrefix.length > 0) {
      const prefix = commonPrefix.join(' ');
      const suffixes = titles.map(t => t.slice(prefix.length).trim()).filter(Boolean);
      return `${prefix} ${suffixes.join(' | ')}`;
    }
    
    return titles.join(' | ');
  };

  // ... (rest of the component unchanged, just including the necessary parts for compilation) ...
  // --- Drag & Drop Logic ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCardIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData('type', 'REORDER');
  };

  const handleLinkDragStart = (e: React.DragEvent, card: ReceptionCard) => {
    e.stopPropagation();
    setLinkingSourceId(card.id);
    e.dataTransfer.effectAllowed = "link";
    e.dataTransfer.setData('type', 'LINK');
    e.dataTransfer.setData('sourceId', card.id);
    
    const div = document.createElement('div');
    div.style.width = '20px';
    div.style.height = '20px';
    div.style.background = '#3b82f6';
    div.style.borderRadius = '50%';
    div.style.border = '2px solid white';
    document.body.appendChild(div);
    e.dataTransfer.setDragImage(div, 10, 10);
    setTimeout(() => document.body.removeChild(div), 0);
  };

  const handleDragOver = (e: React.DragEvent, targetCard: ReceptionCard, index: number) => {
    e.preventDefault();
    
    if (linkingSourceId) {
        const sourceCard = cards.find(c => c.id === linkingSourceId);
        if (sourceCard && sourceCard.deptId === targetCard.deptId && linkingSourceId !== targetCard.id) {
            e.dataTransfer.dropEffect = "link";
            setLinkingHoverTargetId(targetCard.id);
        } else {
            e.dataTransfer.dropEffect = "none";
            setLinkingHoverTargetId(null);
        }
    } else if (draggedCardIndex !== null) {
        e.dataTransfer.dropEffect = "move";
        if (draggedCardIndex === index) return;
        
        const newCards = [...cards];
        const draggedItem = newCards[draggedCardIndex];
        newCards.splice(draggedCardIndex, 1);
        newCards.splice(index, 0, draggedItem);
        reorderReceptionCards(newCards);
        setDraggedCardIndex(index);
    }
  };

  const handleDragLeave = () => {
      if (linkingSourceId) {
          setLinkingHoverTargetId(null);
      }
  };

  const handleDrop = (e: React.DragEvent, targetCard: ReceptionCard) => {
    e.preventDefault();
    setDraggedCardIndex(null);
    setLinkingHoverTargetId(null);

    const type = e.dataTransfer.getData('type');
    
    if (type === 'LINK' && linkingSourceId) {
        const sourceCard = cards.find(c => c.id === linkingSourceId);
        if (sourceCard && sourceCard.deptId === targetCard.deptId && linkingSourceId !== targetCard.id) {
            // MERGE: Update source card to share the target's sequenceKey
            updateReceptionCard(sourceCard.id, { sequenceKey: targetCard.sequenceKey });
        }
        setLinkingSourceId(null);
    }
  };

  const handleDragEnd = () => {
      setLinkingSourceId(null);
      setLinkingHoverTargetId(null);
      setDraggedCardIndex(null);
  };

  const handleEditClick = (e: React.MouseEvent, card: ReceptionCard) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCard(card);
  };

  const handleToggleActive = (e: React.MouseEvent, card: ReceptionCard) => {
    e.preventDefault();
    e.stopPropagation();
    updateReceptionCard(card.id, { isActive: !card.isActive });
  };

  // Helper to Update Editing Card and Sync Props
  const updateEditingCard = (field: keyof ReceptionCard, value: any) => {
    if (!editingCard) return;
    
    let updatedCard = { ...editingCard, [field]: value };

    // Auto-sync logic for Department (Color & Icon)
    if (field === 'deptId') {
       const dept = state.departments.find(d => d.id === value);
       if (dept) {
           updatedCard.color = dept.color;
           updatedCard.icon = dept.icon || 'medical';
       }
    }

    // Auto-sync logic for SubLabel (Category + Gender)
    if (field === 'patientGroupIds' || field === 'gender') {
       const groupIds = field === 'patientGroupIds' ? value : updatedCard.patientGroupIds;
       const gen = field === 'gender' ? value : updatedCard.gender;
       
       let sub = "";
       let groupName = "General";
       
       if (groupIds && groupIds.length === 1) {
           const g = state.patientGroups.find(x => x.id === groupIds[0]);
           if (g) {
               // Smart Acronym Logic
               const n = g.name.toLowerCase();
               if (n.includes('soldier') || n.includes('sldr')) groupName = "SLDR";
               else if (n.includes('officer') || n.includes('ofc')) groupName = "OFC";
               else groupName = g.name.toUpperCase().substring(0, 10);
           }
       } else if (groupIds && groupIds.length > 1) {
           groupName = "MULTIPLE";
       } else {
           groupName = "GENERAL";
       }

       // Smart Gender Append
       let genderSuffix = "";
       if (gen === Gender.MALE) genderSuffix = " MALE";
       else if (gen === Gender.FEMALE) genderSuffix = " FEMALE";
       else if (gen === Gender.NONE && groupName !== "GENERAL") genderSuffix = ""; // Don't append if Any, unless specifically needed? 
       
       sub = `${groupName}${genderSuffix}`;
       
       updatedCard.subLabel = sub;
    }

    setEditingCard(updatedCard);
  };

  const handleAddNewCard = () => {
    const defaultDept = state.departments[0];
    const defaultGroup = state.patientGroups[0];
    const newSequenceKey = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newCardId = `rc_${Date.now()}`;
    
    // 1. Create the Reception Card with a UNIQUE Sequence Key
    const newCard: ReceptionCard = {
      id: newCardId,
      label: "NEW SERVICE",
      subLabel: "GENERAL",
      deptId: defaultDept?.id || '',
      gender: Gender.NONE,
      patientGroupIds: [], // Default to General
      color: defaultDept?.color || "slate",
      icon: defaultDept?.icon || "medical",
      sequenceKey: newSequenceKey, // UNIQUE KEY for Independent Queue
      isActive: true
    };
    addReceptionCard(newCard);
    
    // 2. Automatically Create a Corresponding Counter LINKED to this card
    const newCounter: Counter = {
        id: `c_${Date.now()}`,
        name: `Counter (${newCard.label})`,
        departmentId: newCard.deptId,
        isOnline: true,
        servedGender: newCard.gender,
        servedPatientGroupId: undefined,
        direction: 'NONE',
        receptionCardId: newCardId // Link created here
    };
    addCounter(newCounter);

    setEditingCard(newCard);
  };

  const applyPreset = (type: 'COMPACT' | 'COMFORTABLE' | 'LARGE') => {
    const presets = {
      COMPACT: { clinicNameSize: 14, deptNameSize: 18, tokenNumberSize: 56, dateSize: 10, footerSize: 8, lineSpacing: 0 },
      COMFORTABLE: { clinicNameSize: 18, deptNameSize: 24, tokenNumberSize: 72, dateSize: 12, footerSize: 12, lineSpacing: 8 },
      LARGE: { clinicNameSize: 22, deptNameSize: 32, tokenNumberSize: 90, dateSize: 14, footerSize: 14, lineSpacing: 12 }
    };
    updatePrintSettings(presets[type]);
  };

  // Header Long Press Logic
  const handleHeaderDown = () => {
    longPressTimer.current = window.setTimeout(() => {
      setIsReceptionEditMode(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 2000);
  };

  const handleHeaderUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const timeString = currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  // Splits "10:30:45 AM" -> ["10:30:45", "AM"]
  const timeParts = timeString.split(' ');
  const timeVal = timeParts[0];
  const amPm = timeParts[1];

  return (
    <div className="h-screen w-screen bg-slate-50 text-slate-900 flex flex-col overflow-hidden font-sans selection:bg-blue-100">
      <div id="reception-print-area" className="hidden" />

      {/* Floating Edit Controls */}
      {isReceptionEditMode && (
          <div className="fixed bottom-6 right-6 z-50 flex flex-row items-center gap-3 animate-in slide-in-from-bottom-4">
             <button onClick={() => setShowReceiptDesigner(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-full shadow-xl hover:bg-blue-700 transition-all font-bold uppercase tracking-wider text-xs border border-blue-500">
                <Icons.Printer size={18} /> Print Layout
             </button>
             <button onClick={() => setDeviceRole('UNSET')} className="flex items-center gap-2 bg-red-600 text-white px-5 py-3 rounded-full shadow-xl hover:bg-red-700 transition-all font-bold uppercase tracking-wider text-xs border border-red-500">
                <Icons.Cpu size={18} /> Reset Role
             </button>
             <button onClick={() => setIsReceptionEditMode(false)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-full shadow-2xl hover:bg-emerald-700 transition-all font-black uppercase tracking-wider text-sm border-2 border-emerald-400">
                <Icons.CheckCircle size={20} /> Done
             </button>
          </div>
       )}

      {/* Category Selection Modal */}
      {cardForSelection && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-3xl w-full p-8 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{cardForSelection.label}</h2>
                    <p className="text-slate-500 font-bold mt-1">Select Patient Category</p>
                 </div>
                 <button onClick={() => setCardForSelection(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-600"><Icons.XCircle size={28} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-4 pb-4">
                 {state.patientGroups
                    .filter(g => g.isActive && (cardForSelection.card.patientGroupIds?.length === 0 || cardForSelection.card.patientGroupIds?.includes(g.id)))
                    .sort((a,b) => a.priority - b.priority)
                    .map(group => (
                       <button
                          key={group.id}
                          onClick={() => handleIssueToken(cardForSelection.card, group.id, cardForSelection.label)}
                          className={`
                             relative overflow-hidden rounded-2xl border-2 p-4 text-center transition-all hover:scale-[1.02] active:scale-95 flex flex-col items-center justify-center gap-3
                             bg-white hover:bg-${group.color || 'blue'}-50 border-slate-100 hover:border-${group.color || 'blue'}-200 shadow-sm
                          `}
                       >
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${group.color || 'blue'}-100 text-${group.color || 'blue'}-600`}>
                             {group.customIcon ? (
                                <img src={group.customIcon} className="w-8 h-8 object-contain" />
                             ) : (
                                <Icons.Users size={24} />
                             )}
                          </div>
                          <div>
                             <span className="block font-black text-slate-800 uppercase text-xs tracking-wide">{group.name}</span>
                             <span className="block font-serif text-slate-500 text-sm mt-1">{group.nameUrdu}</span>
                          </div>
                       </button>
                    ))}
              </div>
           </div>
        </div>
      )}

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-[80] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-6 shrink-0">
                 <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Edit Card</h2>
                 <button onClick={() => setEditingCard(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><Icons.XCircle size={24} /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Button Label</label>
                    <input 
                      value={editingCard.label}
                      onChange={(e) => updateEditingCard('label', e.target.value)}
                      className="w-full font-bold text-lg border-b-2 border-slate-200 focus:border-blue-500 outline-none py-1"
                    />
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Department</label>
                    <div className="grid grid-cols-2 gap-2">
                       {state.departments.map(d => (
                          <button 
                             key={d.id}
                             onClick={() => updateEditingCard('deptId', d.id)}
                             className={`p-2 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${editingCard.deptId === d.id ? `bg-${d.color}-50 border-${d.color}-500 text-${d.color}-700 ring-1 ring-${d.color}-500` : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                          >
                             <div className={`w-2 h-2 rounded-full bg-${d.color}-500`} />
                             <span className="truncate">{d.name}</span>
                          </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Gender Restriction</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                       {[Gender.NONE, Gender.MALE, Gender.FEMALE].map(g => (
                          <button
                             key={g}
                             onClick={() => updateEditingCard('gender', g)}
                             className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${editingCard.gender === g ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                          >
                             {g === 'NONE' ? 'Any' : g}
                          </button>
                       ))}
                    </div>
                 </div>

                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block">Patient Category</label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-2">
                       {state.patientGroups.map(g => {
                          const isSelected = editingCard.patientGroupIds?.includes(g.id);
                          return (
                             <button
                                key={g.id}
                                onClick={() => {
                                   const current = editingCard.patientGroupIds || [];
                                   const newIds = isSelected 
                                      ? current.filter(id => id !== g.id)
                                      : [...current, g.id];
                                   updateEditingCard('patientGroupIds', newIds);
                                }}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-bold transition-all ${isSelected ? `bg-${g.color || 'blue'}-50 text-${g.color || 'blue'}-700` : 'hover:bg-slate-50 text-slate-500'}`}
                             >
                                <div className="flex items-center gap-2">
                                   <div className={`w-2 h-2 rounded-full ${isSelected ? `bg-${g.color || 'blue'}-500` : 'bg-slate-300'}`} />
                                   {g.name}
                                </div>
                                {isSelected && <Icons.CheckCircle size={12} />}
                             </button>
                          );
                       })}
                    </div>
                 </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex gap-3 shrink-0">
                 <button onClick={() => { updateReceptionCard(editingCard.id, editingCard); setEditingCard(null); }} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-blue-700">Save Changes</button>
              </div>
           </div>
        </div>
      )}

      {/* ... (Previous Modals and Toasts - Unchanged) ... */}

      {/* Header */}
      <header 
        onMouseDown={handleHeaderDown}
        onMouseUp={handleHeaderUp}
        onMouseLeave={handleHeaderUp}
        onTouchStart={handleHeaderDown}
        onTouchEnd={handleHeaderUp}
        className="h-auto py-2 md:py-3 md:min-h-[7rem] px-4 md:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-20 select-none cursor-pointer transition-colors active:bg-slate-50"
      >
        <div className="flex items-center gap-6 flex-1 min-w-0">
           <div className="flex items-center gap-3 shrink-0">
              <div className="bg-slate-900 text-white p-2.5 rounded-2xl shadow-lg shadow-slate-200"><Icons.Zap size={24} fill="currentColor" /></div>
              <div><h1 className="text-lg md:text-xl font-black uppercase tracking-tight leading-none text-slate-800">Reception</h1><p className="text-[10px] font-bold text-slate-400 mt-0.5">Fast Track Console</p></div>
           </div>
           
           <div className="hidden xl:block h-12 w-px bg-slate-100 shrink-0" />
           
           {/* Stat Cards - Middle Section */}
           <div className="hidden md:flex gap-2 flex-wrap items-center justify-start px-1 py-1 flex-1 max-w-[65vw] max-h-[160px] overflow-y-auto no-scrollbar content-center">
              {/* Grand Total Card */}
              <div className="relative flex items-center pl-3 pr-5 py-2.5 rounded-2xl border bg-slate-900 border-slate-800 shadow-lg shrink-0 min-w-fit transition-all hover:scale-105 cursor-default group text-white">
                 <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                    <span className="text-lg font-black">{grandStats.total}</span>
                 </div>
                 <div className="flex flex-col ml-3 justify-center h-10">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 leading-none mb-1">Grand Total</span>
                    <div className="flex items-center gap-3 text-xs font-bold leading-none">
                       <span className="text-amber-400 flex items-center gap-1" title="Waiting"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {grandStats.waiting}</span>
                       <span className="opacity-30">|</span>
                       <span className="text-emerald-400 flex items-center gap-1" title="Served"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {grandStats.served}</span>
                    </div>
                 </div>
              </div>

              {/* Department Cards */}
              {deptStats.map(stat => {
                 return (
                    <div key={stat.id} className={`relative flex items-center pl-2 pr-3 py-2 rounded-2xl border bg-${stat.color}-50 border-${stat.color}-100 shadow-sm shrink-0 min-w-fit transition-all hover:scale-105 hover:shadow-md cursor-default group overflow-hidden`}>
                       <div className={`h-10 w-10 rounded-xl bg-white border border-${stat.color}-200 flex items-center justify-center text-${stat.color}-600 shadow-sm group-hover:scale-110 transition-transform`}>
                          <span className="text-lg font-black">{stat.total}</span>
                       </div>
                       <div className="flex flex-col ml-3 justify-center h-10 min-w-[60px]">
                          <span className={`text-xs font-black uppercase tracking-wider text-${stat.color}-800 leading-none mb-1`}>{stat.label}</span>
                          <div className={`flex items-center gap-2 text-[10px] font-bold text-${stat.color}-600/80 leading-none`}>
                             <span className="flex items-center gap-1" title="Waiting"><div className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {stat.waiting}</span>
                             <span className="opacity-50">|</span>
                             <span className="flex items-center gap-1" title="Served"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {stat.served}</span>
                          </div>
                       </div>
                    </div>
                 );
              })}
           </div>
        </div>

        {/* Enhanced Clock Section */}
        <div className="flex items-center gap-6 shrink-0 pl-6 border-l border-slate-100 ml-4">
           {lastToken && (
             <div className="hidden 2xl:flex items-center gap-3 animate-in slide-in-from-right-4 fade-in">
                <div className="text-right">
                    <div className={`text-[10px] font-black uppercase tracking-widest text-${lastToken.color}-600`}>Last Token</div>
                    <div className="text-xs font-bold text-slate-400">{lastToken.dept}</div>
                </div>
                <div className={`text-3xl font-black text-${lastToken.color}-600 bg-${lastToken.color}-50 px-3 py-1 rounded-xl border border-${lastToken.color}-100`}>
                    {lastToken.number}
                </div>
             </div>
           )}

           <div className="text-right">
               <div className="flex items-center justify-end gap-2 text-slate-800">
                   <Icons.Clock size={20} className="text-emerald-500 mb-1" strokeWidth={2.5} />
                   <div className="font-black text-3xl md:text-4xl tracking-tighter tabular-nums leading-none flex items-baseline">
                      {timeVal}
                      <span className="text-xs md:text-base text-slate-400 font-bold ml-1 uppercase tracking-wide transform -translate-y-0.5">
                        {amPm}
                      </span>
                   </div>
               </div>
               <div className="flex items-center justify-end gap-1.5 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mt-1 pr-1">
                   <Icons.Calendar size={12} className="text-slate-300" />
                   {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               </div>
           </div>
        </div>
      </header>

      {/* Grid Canvas */}
      <main className="flex-1 p-2 md:p-4 bg-slate-50/50 overflow-y-auto relative scroll-smooth flex flex-col">
         {isReceptionEditMode && (
            <div className="fixed bottom-6 left-6 z-50 bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-lg animate-bounce pointer-events-none border border-yellow-500">
               Edit Mode Active
            </div>
         )}
         <div 
            className="w-full grid gap-2 md:gap-4 pb-2 content-start" 
            style={{ 
              ...gridStyle, 
              gridAutoRows: 'minmax(115px, 145px)' 
            }}
         >
            {displayItems.map((item) => {
               const primaryCard = item.cards[0];
               const nextToken = getNextTokenNumber(primaryCard.deptId, primaryCard.gender, primaryCard.sequenceKey);
               const waitingCount = getWaitingCount(primaryCard.deptId, primaryCard.gender, primaryCard.sequenceKey);
               const CardIcon = ICON_MAP[primaryCard.icon] || Icons.Scan;
               
               // Merged Properties
               const isMerged = item.type === 'merged';
               const mergedLabel = isMerged ? getMergedTitle(item.cards) : primaryCard.label;
               // Determine span (min of cards length or gridCols to avoid overflow)
               const colSpan = isMerged ? Math.min(item.cards.length, gridCols) : 1;
               
               // Visual Linking Indicator for Single Cards in Edit Mode
               const linkedCount = isReceptionEditMode ? cards.filter(c => c.sequenceKey && c.sequenceKey === primaryCard.sequenceKey).length : 1;
               const isLinked = linkedCount > 1;
               
               // Determine if this card is being hovered by a connector drag
               const isLinkTarget = linkingHoverTargetId === primaryCard.id;
               
               // Gender Display
               const genderDisp = getGenderDisplay(primaryCard.gender);

               // Crowded Card Heuristic
               const isCrowded = (mergedLabel.length + primaryCard.subLabel.length) > 22;

               return (
                 <div
                   key={item.id}
                   draggable={isReceptionEditMode}
                   onDragStart={(e) => isReceptionEditMode && handleDragStart(e, item.index)}
                   onDragOver={(e) => isReceptionEditMode && handleDragOver(e, primaryCard, item.index)}
                   onDragLeave={() => isReceptionEditMode && handleDragLeave()}
                   onDrop={isReceptionEditMode ? (e) => handleDrop(e, primaryCard) : undefined}
                   onDragEnd={isReceptionEditMode ? handleDragEnd : undefined}
                   onClick={() => handleIssueToken(primaryCard, undefined, mergedLabel)}
                   className={`
                     reception-card
                     relative overflow-visible rounded-[1.5rem] md:rounded-[2rem] transition-all select-none
                     flex flex-col justify-between text-left p-2 md:p-3
                     border-[3px] shadow-sm 
                     ${isReceptionEditMode ? 'cursor-move animate-wiggle' : 'hover:shadow-2xl hover:-translate-y-1 cursor-pointer active:scale-[0.98]'}
                     ${primaryCard.isActive ? `bg-${primaryCard.color}-50 border-${primaryCard.color}-200 hover:border-${primaryCard.color}-500 hover:bg-${primaryCard.color}-100` : 'bg-slate-50 border-slate-200 opacity-60'}
                     ${isLinkTarget ? 'ring-4 ring-blue-500 ring-offset-2 border-blue-500 scale-105 z-50 bg-blue-50' : ''}
                   `}
                   style={{ 
                      containerType: 'inline-size', 
                      containerName: 'reception-card',
                      gridColumn: `span ${colSpan}`,
                   } as React.CSSProperties}
                 >
                    {/* ... (Existing Linking Indicators) ... */}

                    {/* Watermark */}
                    <div className="absolute inset-0 overflow-hidden rounded-[1.5rem] md:rounded-[2rem] pointer-events-none">
                        <div className={`absolute -right-8 -bottom-8 opacity-[0.05] group-hover:opacity-20 transition-opacity text-${primaryCard.color}-600 rotate-12`}>
                           <CardIcon size={isMerged ? 200 : 160} />
                        </div>
                    </div>

                    {isMerged ? (
                      // --- MERGED LAYOUT (Horizontal/Wide) ---
                      <div className="relative z-10 w-full h-full flex items-center justify-between px-2 md:px-4 gap-4">
                          {/* Identity Section */}
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                              {/* Large Icon */}
                              <div className={`shrink-0 w-16 md:w-20 h-16 md:h-20 rounded-2xl bg-white shadow-md border border-${primaryCard.color}-100 text-${primaryCard.color}-600 flex items-center justify-center`}>
                                  <CardIcon size={40} />
                              </div>
                              
                              {/* Text Info */}
                              <div className="flex flex-col min-w-0 justify-center">
                                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-3xl md:text-4xl truncate leading-none mb-2 pb-1">{mergedLabel}</h3>
                                  <div className="flex items-center gap-3">
                                      <span className={`inline-block px-3 py-1 rounded-lg text-sm font-black uppercase tracking-wider bg-white border border-${primaryCard.color}-200 text-${primaryCard.color}-700 shadow-sm`}>
                                          {primaryCard.subLabel}
                                      </span>
                                      {!primaryCard.isActive && <span className="text-xs font-black uppercase text-red-500 bg-red-100 px-2 py-1 rounded-lg">Offline</span>}
                                      {/* Optional Gender Icon if relevant, though merged might mix genders? Usually sequenceKey merges identical logic. */}
                                      <span className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-white/50 px-2 py-1 rounded-lg">
                                          <Icons.Layers size={14} /> 
                                          {item.cards.length} Counters
                                      </span>
                                  </div>
                              </div>
                          </div>

                          {/* Stats Section */}
                          <div className={`flex items-center gap-4 md:gap-8 shrink-0 bg-white/60 p-3 rounded-2xl border border-${primaryCard.color}-100/50 shadow-sm backdrop-blur-sm`}>
                              {/* Next Token */}
                              <div className="flex flex-col items-end min-w-[100px]">
                                  <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Next Token</div>
                                  <div className="flex items-center gap-3">
                                      <Icons.Printer size={32} className={`text-${primaryCard.color}-400 opacity-80`} />
                                      <div className={`font-black tracking-tighter tabular-nums text-${primaryCard.color}-600 leading-none text-5xl md:text-6xl`}>
                                          {nextToken}
                                      </div>
                                  </div>
                              </div>

                              {primaryCard.isActive && (
                                  <>
                                      <div className="w-px h-16 bg-slate-300/50" />
                                      
                                      {/* Waiting */}
                                      <div className="flex flex-col items-end min-w-[80px]">
                                          <div className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1">Waiting</div>
                                          <div className="flex items-center gap-3">
                                              <Icons.Users size={32} className={`text-${primaryCard.color}-400 opacity-80`} />
                                              <div className={`font-black tracking-tighter tabular-nums text-${primaryCard.color}-600 leading-none text-5xl`}>
                                                  {waitingCount}
                                              </div>
                                          </div>
                                      </div>
                                  </>
                              )}
                          </div>
                      </div>
                    ) : (
                      // --- SINGLE CARD LAYOUT (Vertical/Compact) ---
                      <>
                        <div className="relative z-10 flex-1 flex flex-col min-h-0">
                          {/* Flexible Header */}
                          <div className="flex items-center min-h-[2.5rem] w-full relative overflow-hidden">
                              
                              {/* Icon - Lowest Priority - Hidden on small cards or if very crowded */}
                              {!isCrowded && (
                                  <div 
                                        className="reception-icon flex-none transition-all duration-300 overflow-hidden pr-2"
                                        style={{ 
                                            flex: '0 10000 auto', 
                                            width: '3rem', 
                                            minWidth: 0
                                        }} 
                                  >
                                        <div className="w-12 h-12 flex items-center justify-center">
                                            <div className={`w-full h-full rounded-xl bg-white shadow-sm border border-${primaryCard.color}-100 text-${primaryCard.color}-600 flex items-center justify-center`}>
                                                <CardIcon size={24} />
                                            </div>
                                        </div>
                                  </div>
                              )}

                              {/* Text - Highest Priority */}
                              <div className="flex-1 min-w-0 flex flex-col justify-center h-full relative z-10 gap-0.5" style={{ flexShrink: 1 }}>
                                  <h3 className="font-black text-slate-800 uppercase leading-tight tracking-tight line-clamp-1 text-lg md:text-xl truncate pb-0.5">
                                      {mergedLabel}
                                  </h3>
                                  
                                  <div className="flex items-center gap-2 shrink-0 w-full overflow-hidden">
                                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] md:text-xs font-black uppercase tracking-wider bg-white border border-${primaryCard.color}-200 text-${primaryCard.color}-700 shadow-sm truncate max-w-full`}>
                                        {primaryCard.subLabel}
                                      </span>
                                      {!primaryCard.isActive && <span className="text-[9px] font-black uppercase text-red-400 bg-red-50 px-1 rounded shrink-0">Offline</span>}
                                      {isMerged && <span className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-0.5 shrink-0"><Icons.Layers size={8} /> x{item.cards.length}</span>}
                                  </div>
                              </div>
                              
                              {/* Gender - Medium Priority */}
                              {!isReceptionEditMode && (
                                  <div 
                                      className={`reception-gender flex-none transition-all duration-300 overflow-hidden pl-1 ${genderDisp.color}`}
                                      style={{ 
                                          flex: '0 5000 auto', 
                                          minWidth: 0,
                                          opacity: 0.25
                                      }}
                                  >
                                    <div className="h-full flex items-center justify-center">
                                        <span 
                                            className="text-4xl font-bold select-none leading-none"
                                            style={{ fontFamily: '"Arial Unicode MS", "Lucida Sans Unicode", sans-serif' }}
                                          >
                                            {genderDisp.symbol}
                                          </span>
                                    </div>
                                  </div>
                              )}
                          </div>
                        </div>

                        <div className="relative z-10 mt-auto pt-2 border-t border-slate-100/50 shrink-0">
                          <div className="flex items-end justify-between">
                              <div className="min-w-0">
                                <div className="text-[8px] md:text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-0.5 truncate">
                                    {isMerged ? "Next Combined" : "Next Token"}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Icons.Printer size={22} className={`text-${primaryCard.color}-400`} />
                                    <div className={`font-black tracking-tighter tabular-nums text-${primaryCard.color}-600 leading-none text-3xl md:text-4xl`}>
                                        {nextToken}
                                    </div>
                                </div>
                              </div>
                              {!isReceptionEditMode && primaryCard.isActive && (
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="w-0.5 h-10 bg-slate-900/10 rounded-full" />
                                    <div className="flex flex-col items-end justify-end">
                                      <div className="text-[8px] md:text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-0.5">Waiting</div>
                                      <div className="flex items-center gap-1.5">
                                          <Icons.Users size={22} className={`text-${primaryCard.color}-400`} />
                                          <span className={`text-3xl md:text-4xl font-black text-${primaryCard.color}-600 leading-none tabular-nums`}>{waitingCount}</span>
                                      </div>
                                    </div>
                                </div>
                              )}
                              
                              {/* Embedded Edit Controls */}
                              {isReceptionEditMode && (
                                <div 
                                    className="grid grid-cols-2 gap-1.5 mt-2 w-fit ml-auto cursor-default relative" 
                                    onMouseDown={(e) => e.stopPropagation()} 
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* ... (Edit controls logic unchanged) ... */}
                                    {confirmingDeleteId !== primaryCard.id && confirmingUnlinkId !== primaryCard.id && (
                                        <>
                                            <button 
                                                onClick={(e) => handleToggleActive(e, primaryCard)} 
                                                className={`p-1.5 rounded-md shadow-sm border transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${primaryCard.isActive ? 'bg-white border-emerald-200 text-emerald-600' : 'bg-white border-red-200 text-red-500'}`}
                                                title={primaryCard.isActive ? 'Disable' : 'Enable'}
                                                aria-label={primaryCard.isActive ? 'Disable' : 'Enable'}
                                            >
                                            <Icons.Zap size={12} className={primaryCard.isActive ? 'fill-emerald-600' : ''} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleEditClick(e, primaryCard)} 
                                                className="p-1.5 rounded-md bg-white border border-blue-200 text-blue-600 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                                                title="Edit"
                                                aria-label="Edit"
                                            >
                                            <Icons.Settings size={12} />
                                            </button>
                                            {linkedCount > 1 ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setConfirmingUnlinkId(primaryCard.id);
                                                    }} 
                                                    className="p-1.5 rounded-md bg-white border border-amber-200 text-amber-600 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                                                    title="Unlink (Detach from group)"
                                                    aria-label="Unlink"
                                                >
                                                    <Icons.Scissors size={12} />
                                                </button>
                                            ) : (
                                                // Link Handle Button
                                                <div 
                                                    draggable 
                                                    onDragStart={(e) => handleLinkDragStart(e, primaryCard)}
                                                    className="p-1.5 rounded-md bg-blue-500 text-white shadow-sm hover:bg-blue-600 cursor-grab active:cursor-grabbing flex items-center justify-center transition-all hover:scale-105"
                                                    title="Drag to Link/Merge"
                                                >
                                                    <Icons.Link size={12} />
                                                </div>
                                            )}
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation(); 
                                                    setConfirmingDeleteId(primaryCard.id); 
                                                }} 
                                                className={`p-1.5 rounded-md bg-white border border-red-200 text-red-500 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center`}
                                                title="Delete"
                                                aria-label="Delete"
                                            >
                                            <Icons.Trash2 size={12} />
                                            </button>
                                        </>
                                    )}

                                    {/* Delete Confirmation UI */}
                                    {confirmingDeleteId === primaryCard.id && (
                                        <div className="col-span-2 flex gap-1 animate-in zoom-in duration-200 absolute right-0 bottom-0 min-w-[120px] justify-end bg-white/90 p-1 rounded-lg shadow-lg border border-red-100 z-50">
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    removeReceptionCard(primaryCard.id);
                                                    setConfirmingDeleteId(null);
                                                }}
                                                className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold rounded-md shadow-md hover:bg-red-700 whitespace-nowrap"
                                            >
                                                Confirm Del
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setConfirmingDeleteId(null);
                                                }}
                                                className="px-2 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-300"
                                            >
                                                X
                                            </button>
                                        </div>
                                    )}

                                    {/* Unlink Confirmation UI */}
                                    {confirmingUnlinkId === primaryCard.id && (
                                        <div className="col-span-2 flex gap-1 animate-in zoom-in duration-200 absolute right-0 bottom-0 min-w-[120px] justify-end bg-white/90 p-1 rounded-lg shadow-lg border border-amber-100 z-50">
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    // Generate new unique sequence key for independent queue
                                                    const newKey = `seq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                                                    updateReceptionCard(primaryCard.id, { sequenceKey: newKey });
                                                    setConfirmingUnlinkId(null);
                                                }}
                                                className="px-3 py-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-md shadow-md hover:bg-amber-600 whitespace-nowrap"
                                            >
                                                Confirm Unlink
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setConfirmingUnlinkId(null);
                                                }}
                                                className="px-2 py-1.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-md hover:bg-slate-300"
                                            >
                                                X
                                            </button>
                                        </div>
                                    )}
                                </div>
                              )}
                          </div>
                        </div>
                      </>
                    )}
                 </div>
               );
            })}
            
            {/* Add New Card Button */}
            {isReceptionEditMode && (
               <button onClick={handleAddNewCard} className="rounded-[2rem] border-4 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all min-h-[150px]" aria-label="Add New Card">
                  <div className="p-3 bg-white rounded-full shadow-sm mb-2"><Icons.Plus size={24} /></div>
                  <span className="font-black uppercase tracking-widest text-xs">Add Card</span>
               </button>
            )}
         </div>
      </main>
      
      <style>{`
        @container reception-card (max-width: 160px) {
          .reception-icon {
            display: none !important;
          }
        }
        @container reception-card (max-width: 140px) {
          .reception-gender {
            display: none !important;
          }
        }
        @keyframes wiggle { 
          0% { transform: rotate(0deg); } 
          25% { transform: rotate(1deg); } 
          50% { transform: rotate(0deg); } 
          75% { transform: rotate(-1deg); } 
          100% { transform: rotate(0deg); } 
        }
        .animate-wiggle { animation: wiggle 0.3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
