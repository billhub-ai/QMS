
import React, { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { AppState, Department, Counter, Token, TokenStatus, Gender, KioskImageSettings, SystemLanguage, PrintSettings, DisplayMode, PatientGroup, DeviceRole, AudioSourceType, ReceptionCard } from '../types';

interface QueueContextType {
  state: AppState;
  isEditMode: boolean;
  isNetworkSync: boolean; // WebSocket Connection
  isOnline: boolean; // Internet Connection
  deviceRole: DeviceRole;
  boundCounterId: string | null; // New: Permanent Binding
  setDeviceRole: (role: DeviceRole) => void;
  bindDevice: (counterId: string) => void; // New: Bind Method
  unbindDevice: () => void; // New: Unbind Method
  setIsEditMode: (value: boolean) => void;
  setServerIp: (ip: string) => void; 
  addToken: (departmentId: string, gender: Gender, patientGroupId?: string, sequenceKey?: string, customPrefix?: string) => Token;
  updateTokenStatus: (tokenId: string, status: TokenStatus, counterId?: string) => void;
  updateTokenData: (tokenId: string, updates: Partial<Token>) => void;
  transferToken: (tokenId: string, targetDeptId: string, priorityType: 'NORMAL' | 'PRIORITY' | 'EMERGENCY', keepInSource: boolean) => void;
  addDepartment: (dept: Department) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  removeDepartment: (id: string) => void;
  addCounter: (counter: Counter) => void;
  updateCounter: (id: string, updates: Partial<Counter>) => void;
  removeCounter: (id: string) => void;
  addPatientGroup: (group: PatientGroup) => void;
  updatePatientGroup: (id: string, updates: Partial<PatientGroup>) => void;
  removePatientGroup: (id: string) => void;
  
  // Reception Card Actions
  addReceptionCard: (card: ReceptionCard) => void;
  updateReceptionCard: (id: string, updates: Partial<ReceptionCard>) => void;
  removeReceptionCard: (id: string) => void;
  removeReceptionCards: (ids: string[]) => void; // New bulk delete
  reorderReceptionCards: (newOrder: ReceptionCard[]) => void;

  toggleCounterStatus: (counterId: string) => void;
  clearTokens: () => void;
  factoryReset: () => void;
  callNextToken: (counterId: string) => Token | null;
  releaseCounterTokens: (counterId: string, actionForCurrent: 'RETURN_TO_POOL' | 'COMPLETE') => void;
  updateClinicDetails: (name: string, nameUrdu: string) => void;
  updateKioskBranding: (welcome: string, title: string, subTitle: string) => void;
  updateKioskImage: (image: string | undefined) => void;
  updateClinicLogo: (image: string | undefined) => void;
  updateKioskImageSettings: (settings: Partial<KioskImageSettings>) => void;
  updateSystemLanguage: (lang: SystemLanguage) => void;
  updatePrintSettings: (settings: Partial<PrintSettings>) => void;
  updateDisplayMode: (mode: DisplayMode) => void;
  toggleShowRoomNumber: () => void;
  updateAdminPin: (pin: string) => void;
  seedDatabase: () => void;
  clearUserData: () => void;
  resetDepartments: () => void;
  resetClinicSettings: () => void;
  updateAnnouncementVoice: (voiceURI: string) => void;
  updateAudioSource: (source: AudioSourceType) => void; // New method
  forceSync: () => void; // Manual sync trigger
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Seed Data - Updated for specific user categories
const INITIAL_GROUPS: PatientGroup[] = [
  { id: 'grp_martyr', name: 'Martyr Family', nameUrdu: 'خاندان شہداء', priority: 1, color: 'rose', icon: 'star', isActive: true },
  { id: 'grp_war_wounded', name: 'War Wounded', nameUrdu: 'جنگی زخمی', priority: 2, color: 'red', icon: 'accessibility', isActive: true },
  { id: 'grp_senior', name: 'Senior Citizen', nameUrdu: 'سینئر سٹیزن', priority: 3, color: 'orange', icon: 'clock', isActive: true },
  { id: 'grp_officer', name: 'Officer / Fam', nameUrdu: 'آفیسر / فیملی', priority: 4, color: 'amber', icon: 'medal', isActive: true },
  { id: 'grp_soldier', name: 'JCO / Soldier', nameUrdu: 'جے سی او / جوان', priority: 5, color: 'emerald', icon: 'shield', isActive: true },
  { id: 'grp_civilian', name: 'Civilian', nameUrdu: 'سویلین', priority: 10, color: 'slate', icon: 'users', isActive: true },
];

const INITIAL_DEPTS: Department[] = [
  { id: 'dept_xray', name: 'X-Ray Department', nameUrdu: 'ایکس رے', prefix: 'XR', isGenderSeparated: true, hasSeparateGenderTokenSequences: true, showGenderPrefix: true, showDeptPrefix: true, color: 'blue', icon: 'radiology', isActive: true },
  { id: 'dept_ultrasound', name: 'Ultrasound', nameUrdu: 'الٹراساؤنڈ', prefix: 'USG', isGenderSeparated: true, hasSeparateGenderTokenSequences: true, showGenderPrefix: true, showDeptPrefix: true, color: 'purple', icon: 'ultrasound', isActive: true },
  { id: 'dept_ct', name: 'CT Scan', nameUrdu: 'سی ٹی اسکین', prefix: 'CT', isGenderSeparated: false, hasSeparateGenderTokenSequences: false, showGenderPrefix: true, showDeptPrefix: true, color: 'emerald', icon: 'ct', isActive: true },
  { id: 'dept_mri', name: 'MRI', nameUrdu: 'ایم آر آئی', prefix: 'MRI', isGenderSeparated: false, hasSeparateGenderTokenSequences: false, showGenderPrefix: true, showDeptPrefix: true, color: 'indigo', icon: 'mri', isActive: true },
  { id: 'dept_mammo', name: 'Mammogram', nameUrdu: 'میموگرام', prefix: 'MM', isGenderSeparated: false, hasSeparateGenderTokenSequences: false, showGenderPrefix: true, showDeptPrefix: true, color: 'pink', icon: 'mammography', isActive: true, allowedPatientGroups: ['grp_officer', 'grp_soldier', 'grp_civilian'] }, 
];

// Re-Mapped to Reception Cards for Strict Sequencing
const INITIAL_COUNTERS: Counter[] = [
  { id: 'c_xray_1', name: 'X-Ray 01 (Soldier F)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.FEMALE, servedPatientGroupId: 'grp_soldier', roomNumber: '01', receptionCardId: 'rc_10' },
  { id: 'c_xray_2', name: 'X-Ray 02 (Off Fam)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.FEMALE, servedPatientGroupId: 'grp_officer', roomNumber: '02', receptionCardId: 'rc_11' },
  { id: 'c_xray_3', name: 'X-Ray 03 (Soldier F)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.FEMALE, servedPatientGroupId: 'grp_soldier', roomNumber: '03', receptionCardId: 'rc_12' },
  { id: 'c_xray_4', name: 'X-Ray 04 (Soldier F)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.FEMALE, servedPatientGroupId: 'grp_soldier', roomNumber: '04', receptionCardId: 'rc_13' },
  { id: 'c_xray_5', name: 'X-Ray 05 (Off Male)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.MALE, servedPatientGroupId: 'grp_officer', roomNumber: '05', receptionCardId: 'rc_14' },
  { id: 'c_xray_6', name: 'X-Ray 06 (Soldier M)', departmentId: 'dept_xray', isOnline: true, servedGender: Gender.MALE, servedPatientGroupId: 'grp_soldier', roomNumber: '06', receptionCardId: 'rc_15' },
  { id: 'c_usg_1', name: 'USG Room 1', departmentId: 'dept_ultrasound', isOnline: true, servedGender: Gender.FEMALE, roomNumber: '07', receptionCardId: 'rc_6' },
  { id: 'c_usg_2', name: 'USG Room 2', departmentId: 'dept_ultrasound', isOnline: true, servedGender: Gender.MALE, roomNumber: '08', receptionCardId: 'rc_7' },
  { id: 'c_ct_1', name: 'CT Scan Console 1', departmentId: 'dept_ct', isOnline: true, servedGender: Gender.NONE, roomNumber: '09', receptionCardId: 'rc_1' },
  { id: 'c_ct_2', name: 'CT Scan Console 2', departmentId: 'dept_ct', isOnline: true, servedGender: Gender.NONE, roomNumber: '09', receptionCardId: 'rc_2' },
  { id: 'c_mri_1', name: 'MRI Console 1', departmentId: 'dept_mri', isOnline: true, servedGender: Gender.NONE, roomNumber: '10', receptionCardId: 'rc_4' },
  { id: 'c_mammo_1', name: 'Mammography', departmentId: 'dept_mammo', isOnline: true, servedGender: Gender.FEMALE, roomNumber: '11', receptionCardId: 'rc_3' },
];

const INITIAL_RECEPTION_CARDS: ReceptionCard[] = [
  { id: 'rc_1', label: "CT SCAN 1", subLabel: "General", deptId: "dept_ct", gender: Gender.NONE, patientGroupIds: ["grp_civilian"], color: "emerald", icon: 'ct', sequenceKey: "seq_ct_1", isActive: true },
  { id: 'rc_2', label: "CT SCAN 2", subLabel: "General", deptId: "dept_ct", gender: Gender.NONE, patientGroupIds: ["grp_civilian"], color: "emerald", icon: 'ct', sequenceKey: "seq_ct_2", isActive: true },
  { id: 'rc_3', label: "MAMMO 4", subLabel: "Female", deptId: "dept_mammo", gender: Gender.FEMALE, patientGroupIds: ["grp_civilian"], color: "pink", icon: 'mammography', sequenceKey: "seq_mm_4", isActive: true },
  { id: 'rc_4', label: "MRI 1", subLabel: "General", deptId: "dept_mri", gender: Gender.NONE, patientGroupIds: ["grp_civilian"], color: "indigo", icon: 'mri', sequenceKey: "seq_mri_1", isActive: true },
  { id: 'rc_5', label: "MRI 2", subLabel: "General", deptId: "dept_mri", gender: Gender.NONE, patientGroupIds: ["grp_civilian"], color: "indigo", icon: 'mri', sequenceKey: "seq_mri_2", isActive: true },
  { id: 'rc_6', label: "USG 1", subLabel: "Sldr Female", deptId: "dept_ultrasound", gender: Gender.FEMALE, patientGroupIds: ["grp_soldier"], color: "purple", icon: 'ultrasound', sequenceKey: "seq_usg_1", isActive: true },
  { id: 'rc_7', label: "USG 2", subLabel: "Sldr Female", deptId: "dept_ultrasound", gender: Gender.FEMALE, patientGroupIds: ["grp_soldier"], color: "purple", icon: 'ultrasound', sequenceKey: "seq_usg_2", isActive: true },
  { id: 'rc_8', label: "USG 5", subLabel: "Sldr Male", deptId: "dept_ultrasound", gender: Gender.MALE, patientGroupIds: ["grp_soldier"], color: "purple", icon: 'ultrasound', sequenceKey: "seq_usg_5", isActive: true },
  { id: 'rc_9', label: "USG OFF", subLabel: "Officers (Room 4)", deptId: "dept_ultrasound", gender: Gender.MALE, patientGroupIds: ["grp_officer"], color: "amber", icon: 'ultrasound', sequenceKey: "seq_usg_off", isActive: true },
  { id: 'rc_10', label: "X-RAY 1", subLabel: "Sldr Female", deptId: "dept_xray", gender: Gender.FEMALE, patientGroupIds: ["grp_soldier"], color: "blue", icon: 'radiology', sequenceKey: "seq_xr_1", isActive: true },
  { id: 'rc_11', label: "X-RAY 2", subLabel: "Offrs Family", deptId: "dept_xray", gender: Gender.FEMALE, patientGroupIds: ["grp_officer"], color: "orange", icon: 'radiology', sequenceKey: "seq_xr_2", isActive: true },
  { id: 'rc_12', label: "X-RAY 3", subLabel: "Sldr Female", deptId: "dept_xray", gender: Gender.FEMALE, patientGroupIds: ["grp_soldier"], color: "blue", icon: 'radiology', sequenceKey: "seq_xr_3", isActive: true },
  { id: 'rc_13', label: "X-RAY 4", subLabel: "Sldr Female", deptId: "dept_xray", gender: Gender.FEMALE, patientGroupIds: ["grp_soldier"], color: "blue", icon: 'radiology', sequenceKey: "seq_xr_4", isActive: true },
  { id: 'rc_14', label: "X-RAY 5", subLabel: "Offrs Male", deptId: "dept_xray", gender: Gender.MALE, patientGroupIds: ["grp_officer"], color: "blue", icon: 'radiology', sequenceKey: "seq_xr_5", isActive: true },
  { id: 'rc_15', label: "X-RAY 6", subLabel: "Sldr Male", deptId: "dept_xray", gender: Gender.MALE, patientGroupIds: ["grp_soldier"], color: "blue", icon: 'radiology', sequenceKey: "seq_xr_6", isActive: true },
];

const STORAGE_KEY_STATE = 'zenqueue_state_v3';
const STORAGE_KEY_ROLE = 'zenqueue_device_role_v3'; // Renamed to ensure fresh persistence
const STORAGE_KEY_SERVER_IP = 'zenqueue_server_ip';
const STORAGE_KEY_BOUND_COUNTER = 'zenqueue_bound_counter';

export const QueueProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isNetworkSync, setIsNetworkSync] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const lastUpdateRef = useRef<number>(0);
  const isFirstRender = useRef(true); 
  
  // Use a lazy initializer for deviceRole to read from localStorage immediately
  const [deviceRole, setDeviceRoleState] = useState<DeviceRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE);
      if (saved) {
        return saved as DeviceRole;
      }
    } catch (e) {
      console.error("Error reading role:", e);
    }
    return 'UNSET';
  });

  // Device Binding State
  const [boundCounterId, setBoundCounterId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_BOUND_COUNTER);
  });

  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const updateSource = useRef<'LOCAL' | 'BC' | 'WS'>('LOCAL');
  const pingIntervalRef = useRef<any>(null); // Heartbeat

  const getDefaults = (): AppState => ({
    departments: INITIAL_DEPTS, 
    counters: INITIAL_COUNTERS, 
    tokens: [],
    patientGroups: INITIAL_GROUPS,
    receptionCards: INITIAL_RECEPTION_CARDS,
    clinicName: 'CMH, Quetta (QMS)',
    clinicNameUrdu: 'سی ایم ایچ، کوئٹہ (کیو ایم ایس)',
    kioskWelcomeText: 'Welcome to',
    kioskTitle: 'CMH, Quetta (QMS)',
    kioskSubTitle: 'سی ایم ایچ، کوئٹہ (کیو ایم ایس)',
    adminPin: '123456',
    kioskImageSettings: { widthPercent: 100, verticalAlign: 'end', horizontalAlign: 'end', containerWidthPercent: 25 },
    systemLanguage: 'BOTH',
    displayMode: 'DEPARTMENT',
    showRoomNumberInDisplay: true,
    printSettings: {
      clinicNameSize: 18, deptNameSize: 24, tokenNumberSize: 72, dateSize: 12, footerSize: 12, lineSpacing: 10,
      textAlign: 'center', showClinicName: true, showGender: true, showDate: true, showDepartment: true,
      showTokenNumber: true, showFooter: true, footerText: 'Please watch the screen for your turn.',
      footerTextUrdu: 'براہ کرم اپنی باری کے لیے اسکرین دیکھیں',
      showPatientGroup: true
    },
    lastResetDate: new Date().toDateString(),
    serverIp: localStorage.getItem(STORAGE_KEY_SERVER_IP) || window.location.hostname,
    audioSource: 'BROWSER_TTS',
    lastUpdated: 0,
    dataVersion: 0 // Initialize versioning to prevent stale overwrites
  });

  const [state, setInternalState] = useState<AppState>(() => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_STATE);
        if (!saved) return getDefaults();
        let parsed = JSON.parse(saved);
        if (!parsed.lastResetDate) parsed.lastResetDate = new Date().toDateString();
        if (!parsed.lastUpdated) parsed.lastUpdated = 0;
        if (!parsed.dataVersion) parsed.dataVersion = 0; // Ensure version exists
        
        // --- Critical Fix for IP Auto-Correction ---
        // If the browser URL is an IP address (e.g., 192.168.1.10), use THAT as the default Server IP.
        // This fixes the issue where a client loads the page via IP but tries to connect WS to 'localhost'.
        const currentHostname = window.location.hostname;
        const isIP = /^[0-9.]*$/.test(currentHostname);
        
        if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
             // If we are on a real network IP, prioritize it over localhost storage
             const storedIp = localStorage.getItem(STORAGE_KEY_SERVER_IP);
             if (!storedIp || storedIp === 'localhost' || storedIp === '127.0.0.1' || isIP) {
                 parsed.serverIp = currentHostname;
                 localStorage.setItem(STORAGE_KEY_SERVER_IP, currentHostname);
             }
        }
        
        if (!parsed.receptionCards) parsed.receptionCards = INITIAL_RECEPTION_CARDS;
        else parsed.receptionCards = parsed.receptionCards.map((c: any) => {
            if (c.patientGroupId && !c.patientGroupIds) return { ...c, patientGroupIds: [c.patientGroupId] };
            return c;
        });
        return parsed;
    } catch (e) {
        console.error("Critical: Failed to load state from storage. Resetting to defaults.", e);
        return getDefaults();
    }
  });

  const setServerIp = useCallback((ip: string) => {
    localStorage.setItem(STORAGE_KEY_SERVER_IP, ip);
    setState(prev => ({ ...prev, serverIp: ip }));
    if (wsRef.current) wsRef.current.close();
  }, []);

  const setState = (update: React.SetStateAction<AppState>) => {
     updateSource.current = 'LOCAL';
     setInternalState(prev => {
         const newVal = typeof update === 'function' ? (update as any)(prev) : update;
         // Increment version on every local update to outpace potentially stale server state
         const newVersion = (prev.dataVersion || 0) + 1;
         return { ...newVal, dataVersion: newVersion, lastUpdated: Date.now() };
     });
  };

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Daily Reset
  useEffect(() => {
    const checkDailyReset = () => {
        const today = new Date().toDateString();
        if (state.lastResetDate && state.lastResetDate !== today) {
            console.log("Triggering Automated Daily Reset");
            setState(prev => ({ ...prev, tokens: [], lastResetDate: today }));
        }
    };
    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, [state.lastResetDate]);

  useEffect(() => {
    if (!state.patientGroups || state.patientGroups.length === 0) setState(prev => ({ ...prev, patientGroups: INITIAL_GROUPS }));
    if (!state.adminPin) setState(prev => ({ ...prev, adminPin: '123456' }));
  }, [state.patientGroups, state.adminPin]);

  const setDeviceRole = useCallback((role: DeviceRole) => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, role);
      console.log("Role Saved to Storage:", role);
      setDeviceRoleState(role);
      setIsEditMode(false);
    } catch(e) {
      console.error("Failed to save role:", e);
    }
  }, []);

  const bindDevice = useCallback((counterId: string) => {
    localStorage.setItem(STORAGE_KEY_BOUND_COUNTER, counterId);
    setBoundCounterId(counterId);
    // Also enforce device role to COUNTER
    setDeviceRole('COUNTER');
  }, [setDeviceRole]);

  const unbindDevice = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_BOUND_COUNTER);
    setBoundCounterId(null);
  }, []);

  // Broadcast Channel Setup
  useEffect(() => {
    const bc = new BroadcastChannel('zenqueue_sync_channel');
    broadcastChannelRef.current = bc;
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'SYNC') {
        const incoming = event.data.payload;
        // Accept if version is newer, or if strictly same/newer time on conflict
        if ((incoming.dataVersion || 0) >= (stateRef.current.dataVersion || 0)) {
            updateSource.current = 'BC';
            setInternalState(incoming);
            lastUpdateRef.current = Date.now();
        }
      }
    };
    return () => bc.close();
  }, []);

  // WebSocket Connection
  const connectWebSocket = useCallback(() => {
    // Prevent duplicate connections if already open/connecting
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
    }

    // --- Dynamic IP Logic ---
    // If the browser URL is NOT localhost, we prefer connecting to the Window Hostname over whatever might be in localStorage/state.
    // This solves the common issue of clients stuck trying to connect to 'localhost' when the app is served via IP.
    const currentHostname = window.location.hostname;
    let ip = state.serverIp;
    
    if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
        // If we are on a network IP, assume the WS server is on the same IP
        ip = currentHostname;
    } else {
        // If we are on localhost, fallback to state configuration (which might be localhost or a remote IP)
        if (!ip) ip = 'localhost';
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${ip}:3001`;

    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log("WebSocket Connected to " + wsUrl);
        setIsNetworkSync(true);
        // Important: Ask for data first!
        socket.send(JSON.stringify({ type: 'REQUEST_SYNC' }));
        
        // Start Heartbeat
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'PING' }));
            }
        }, 15000); // 15s Heartbeat
      };
      
      socket.onclose = () => {
        setIsNetworkSync(false);
        wsRef.current = null;
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        clearTimeout(reconnectTimeoutRef.current);
        // Faster reconnect for aggressive sync recovery
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 1000);
      };
      
      socket.onerror = (err) => { 
          // socket.close() will trigger onclose 
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'PONG') return; // Heartbeat response

          if (data.type === 'SYNC' && data.payload) {
            const incoming = data.payload;
            const localVersion = stateRef.current.dataVersion || 0;
            const serverVersion = incoming.dataVersion || 0;

            // Strict Versioning Logic:
            // Always accept if Server is Newer
            if (serverVersion > localVersion) {
                updateSource.current = 'WS';
                setInternalState(incoming);
                lastUpdateRef.current = Date.now();
            } else if (localVersion > serverVersion) {
                // Local is newer -> Push to Server (Offline recovery)
                console.log(`Pushing newer local state (V${localVersion}) to stale server (V${serverVersion})`);
                socket.send(JSON.stringify({ type: 'SYNC', payload: stateRef.current }));
            }
            // If versions equal, do nothing (converged)
          } else if (data.type === 'SYNC_EMPTY') {
            // Server has no data, push ours if we have any
            if (stateRef.current.tokens.length > 0 || stateRef.current.departments.length > 0) {
                 socket.send(JSON.stringify({ type: 'SYNC', payload: stateRef.current }));
            }
          }
        } catch (e) { console.error('Sync Error:', e); }
      };
      wsRef.current = socket;
    } catch (e) {
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [state.serverIp]);

  // Initial Connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectWebSocket]);

  // Online/Offline Listeners - Instant Reconnect Logic
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        console.log("Network Online - Attempting Immediate Reconnect");
        connectWebSocket(); // Trigger immediate reconnect attempt
    };
    const handleOffline = () => setIsOnline(false);
    
    // Visibility Check - Ensure connection is fresh when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab Visible - Checking Connection...");
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
           connectWebSocket();
        } else if (wsRef.current.readyState === WebSocket.OPEN) {
           // Socket is open, but we might have missed messages while backgrounded
           wsRef.current.send(JSON.stringify({ type: 'REQUEST_SYNC' }));
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [connectWebSocket]);

  // Sync Logic - Debounced LocalStorage Write (RPi Optimization)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }

    // GUARD: Do NOT broadcast if state is purely default/empty (DataVersion 0)
    // This prevents a new client from wiping the server on connection.
    if (state.dataVersion === 0) return;

    const source = updateSource.current;

    // IMPORTANT: If source is 'LOCAL', we MUST send to WS.
    // If source is 'WS', we updated via WS, so we DON'T send back to WS (loop prevention).
    if (source === 'LOCAL') {
      if (broadcastChannelRef.current) broadcastChannelRef.current.postMessage({ type: 'SYNC', payload: state });
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'SYNC', payload: state }));
      }
    } else if (source === 'WS') {
      if (broadcastChannelRef.current) broadcastChannelRef.current.postMessage({ type: 'SYNC', payload: state });
    } 
    
    // Always reset source to LOCAL for subsequent user actions
    updateSource.current = 'LOCAL';

    // RPi Optimization: Increased Debounce to 2000ms
    const storageTimeout = setTimeout(() => {
       localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
    }, 2000);

    return () => clearTimeout(storageTimeout);
  }, [state]);

  const forceSync = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'SYNC', payload: stateRef.current }));
      }
  };

  const updateClinicDetails = (name: string, nameUrdu: string) => setState(prev => ({ ...prev, clinicName: name, clinicNameUrdu: nameUrdu }));
  const updateKioskBranding = (welcome: string, title: string, subTitle: string) => setState(prev => ({ ...prev, kioskWelcomeText: welcome, kioskTitle: title, kioskSubTitle: subTitle }));
  const updateKioskImage = (image: string | undefined) => setState(prev => ({ ...prev, kioskImage: image }));
  const updateClinicLogo = (logo: string | undefined) => setState(prev => ({ ...prev, logo: logo }));
  const updateKioskImageSettings = (settings: Partial<KioskImageSettings>) => setState(prev => ({ ...prev, kioskImageSettings: { ...prev.kioskImageSettings, ...settings } }));
  const updateSystemLanguage = (lang: SystemLanguage) => setState(prev => ({ ...prev, systemLanguage: lang }));
  const updatePrintSettings = (settings: Partial<PrintSettings>) => setState(prev => ({ ...prev, printSettings: { ...prev.printSettings, ...settings } }));
  const updateDisplayMode = (mode: DisplayMode) => setState(prev => ({ ...prev, displayMode: mode }));
  const toggleShowRoomNumber = () => setState(prev => ({ ...prev, showRoomNumberInDisplay: !prev.showRoomNumberInDisplay }));
  const updateAdminPin = (pin: string) => setState(prev => ({ ...prev, adminPin: pin }));
  const updateAnnouncementVoice = (voiceURI: string) => setState(prev => ({ ...prev, announcementVoiceURI: voiceURI }));
  const updateAudioSource = (source: AudioSourceType) => setState(prev => ({ ...prev, audioSource: source }));

  const addToken = (departmentId: string, gender: Gender, patientGroupId: string = 'grp_civilian', sequenceKey?: string, customPrefix?: string) => {
    const dept = state.departments.find(d => d.id === departmentId);
    if (!dept) throw new Error("Department not found. Please check configuration.");
    let tokensInDept = state.tokens.filter(t => t.departmentId === departmentId);
    let relevantTokens = tokensInDept;
    
    // --- Sequence Logic Update ---
    // If a sequenceKey is provided (from a Reception Card), we strictly count tokens 
    // that belong to this sequence key. This allows independent queues for rooms in same department.
    // If cards are combined, they share the sequenceKey, thus sharing the counter.
    if (sequenceKey && sequenceKey.trim() !== '') {
        relevantTokens = state.tokens.filter(t => t.sequenceKey === sequenceKey);
    } else {
        // Fallback: Gender-based department sequence (Kiosk behavior)
        const useSeparateSeq = dept.isGenderSeparated && dept.hasSeparateGenderTokenSequences;
        if (useSeparateSeq) relevantTokens = tokensInDept.filter(t => t.gender === gender);
    }
    
    const lastNum = relevantTokens.length > 0 ? Math.max(...relevantTokens.map(t => t.rawNumber)) : 0;
    const nextNum = lastNum + 1;
    let ticketNumber = String(nextNum).padStart(3, '0');
    const newToken: Token = { id: generateId(), departmentId, gender, patientGroupId, rawNumber: nextNum, ticketNumber, status: TokenStatus.WAITING, createdAt: Date.now(), sequenceKey };
    setState(prev => ({ ...prev, tokens: [...prev.tokens, newToken] }));
    return newToken;
  };

  const updateTokenStatus = (tokenId: string, status: TokenStatus, counterId?: string) => {
    setState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t => {
        if (t.id === tokenId) {
            let totalDuration = t.totalDuration || 0;
            if (t.status === TokenStatus.SERVING && status !== TokenStatus.SERVING && t.servedAt) totalDuration += Date.now() - t.servedAt;
            const isServing = status === TokenStatus.SERVING;
            return { ...t, status, counterId: counterId || t.counterId, servedAt: isServing ? Date.now() : t.servedAt, firstServedAt: isServing && !t.firstServedAt ? Date.now() : t.firstServedAt, completedAt: status === TokenStatus.COMPLETED ? Date.now() : t.completedAt, totalDuration };
        }
        return t;
      })
    }));
  };

  const updateTokenData = (tokenId: string, updates: Partial<Token>) => { setState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === tokenId ? { ...t, ...updates } : t) })); };

  const transferToken = (tokenId: string, targetDeptId: string, priorityType: 'NORMAL' | 'PRIORITY' | 'EMERGENCY', keepInSource: boolean) => {
    setState(prev => {
      const targetDept = prev.departments.find(d => d.id === targetDeptId);
      const token = prev.tokens.find(t => t.id === tokenId);
      if (!targetDept || !token) return prev;
      const tokensInTarget = prev.tokens.filter(t => t.departmentId === targetDeptId);
      const useSeparateSeq = targetDept.isGenderSeparated && targetDept.hasSeparateGenderTokenSequences;
      let relevantTokens = tokensInTarget;
      if (useSeparateSeq) relevantTokens = tokensInTarget.filter(t => t.gender === token.gender);
      const lastNum = relevantTokens.length > 0 ? Math.max(...relevantTokens.map(t => t.rawNumber)) : 0;
      const nextNum = lastNum + 1;
      let newTicketNumber = String(nextNum).padStart(3, '0');
      const isEmergency = priorityType !== 'NORMAL';
      let accumulatedDuration = token.totalDuration || 0;
      if (token.status === TokenStatus.SERVING && token.servedAt) accumulatedDuration += Date.now() - token.servedAt;
      let newTokens = [...prev.tokens];
      if (keepInSource) {
        newTokens = newTokens.map(t => t.id === tokenId ? { ...t, status: TokenStatus.ON_HOLD, referredToDeptId: targetDeptId, totalDuration: accumulatedDuration, servedAt: undefined } : t);
        const newToken: Token = { id: generateId(), departmentId: targetDeptId, ticketNumber: newTicketNumber, rawNumber: nextNum, gender: token.gender, patientGroupId: token.patientGroupId, status: TokenStatus.WAITING, createdAt: token.createdAt, isEmergency: isEmergency };
        newTokens.push(newToken);
      } else {
        newTokens = newTokens.map(t => t.id === tokenId ? { ...t, departmentId: targetDeptId, ticketNumber: newTicketNumber, rawNumber: nextNum, status: TokenStatus.WAITING, counterId: undefined, servedAt: undefined, firstServedAt: undefined, isEmergency: isEmergency, totalDuration: accumulatedDuration, sequenceKey: undefined } : t);
      }
      return { ...prev, tokens: newTokens };
    });
  };

  const getPatientGroupPriority = (groupId?: string): number => {
    if (!groupId) return 10;
    const group = state.patientGroups?.find(g => g.id === groupId);
    return group ? group.priority : 10;
  };

  const callNextToken = (counterId: string) => {
    const counter = state.counters.find(c => c.id === counterId);
    if (!counter) return null;
    
    // --- Counter Intelligence: Linked to Reception Card? ---
    // If this counter is physically linked to a reception card (e.g. Room 1), 
    // it should only pick tokens that belong to that card's sequence.
    // If that card is merged with others, they share the sequenceKey, so it works naturally.
    let linkedCard: ReceptionCard | undefined;
    if (counter.receptionCardId) {
        linkedCard = state.receptionCards.find(rc => rc.id === counter.receptionCardId);
    }

    const getQueue = (statuses: TokenStatus[]) => state.tokens.filter(t => {
      const isStatusMatch = statuses.includes(t.status);
      
      // Strict Sequence Logic
      if (linkedCard && linkedCard.sequenceKey) {
          // If configured via Reception Card, enforce strict sequence match.
          // This allows "Room 1" to have its own queue separate from "Room 2" even in same Dept.
          const isSequenceMatch = t.sequenceKey === linkedCard.sequenceKey;
          // Note: Gender and Group are already filtered when token was added to this sequence.
          return isStatusMatch && isSequenceMatch;
      } 
      
      // Fallback: Legacy Department-wide pooling
      const isDeptMatch = t.departmentId === counter.departmentId;
      let isGenderMatch = true;
      if (counter.servedGender && counter.servedGender !== Gender.NONE) isGenderMatch = t.gender === counter.servedGender;
      let isGroupMatch = true;
      if (counter.servedPatientGroupId) isGroupMatch = t.patientGroupId === counter.servedPatientGroupId;
      
      // Exclude tokens that have a sequenceKey but this counter has none (avoid stealing room-specific tokens)
      const isGeneralPool = !t.sequenceKey;

      return isDeptMatch && isStatusMatch && isGenderMatch && isGroupMatch && isGeneralPool;
    }).sort((a,b) => {
      if (a.isEmergency && !b.isEmergency) return -1;
      if (!a.isEmergency && b.isEmergency) return 1;
      const pA = getPatientGroupPriority(a.patientGroupId);
      const pB = getPatientGroupPriority(b.patientGroupId);
      if (pA !== pB) return pA - pB;
      return a.createdAt - b.createdAt;
    });
    
    const next = getQueue([TokenStatus.WAITING])[0] || getQueue([TokenStatus.ON_HOLD, TokenStatus.DEFERRED])[0];
    if (!next) return null;
    updateTokenStatus(next.id, TokenStatus.SERVING, counterId);
    return next;
  };

  const releaseCounterTokens = (counterId: string, actionForCurrent: 'RETURN_TO_POOL' | 'COMPLETE') => {
    setState(prev => {
       const updatedTokens = prev.tokens.map(t => {
          if (t.counterId === counterId && (t.status === TokenStatus.ON_HOLD || t.status === TokenStatus.DEFERRED)) return { ...t, status: TokenStatus.WAITING, counterId: undefined };
          if (t.counterId === counterId && t.status === TokenStatus.SERVING) {
             let totalDuration = t.totalDuration || 0;
             if (t.servedAt) totalDuration += Date.now() - t.servedAt;
             if (actionForCurrent === 'COMPLETE') return { ...t, status: TokenStatus.COMPLETED, completedAt: Date.now(), totalDuration };
             else return { ...t, status: TokenStatus.WAITING, counterId: undefined, servedAt: undefined, totalDuration };
          }
          return t;
       });
       const updatedCounters = prev.counters.map(c => c.id === counterId ? { ...c, isOnline: false } : c);
       return { ...prev, tokens: updatedTokens, counters: updatedCounters };
    });
  };

  const addDepartment = (dept: Department) => setState(prev => ({ ...prev, departments: [...prev.departments, dept] }));
  const updateDepartment = (id: string, updates: Partial<Department>) => setState(prev => ({ ...prev, departments: prev.departments.map(d => d.id === id ? { ...d, ...updates } : d) }));
  const removeDepartment = (id: string) => setState(prev => ({ ...prev, departments: prev.departments.filter(d => d.id !== id) }));
  const addCounter = (counter: Counter) => setState(prev => ({ ...prev, counters: [...prev.counters, counter] }));
  const updateCounter = (id: string, updates: Partial<Counter>) => setState(prev => ({ ...prev, counters: prev.counters.map(c => c.id === id ? { ...c, ...updates } : c) }));
  const removeCounter = (id: string) => setState(prev => ({ ...prev, counters: prev.counters.filter(c => c.id !== id) }));
  const addPatientGroup = (group: PatientGroup) => setState(prev => ({ ...prev, patientGroups: [...(prev.patientGroups || []), group] }));
  const updatePatientGroup = (id: string, updates: Partial<PatientGroup>) => setState(prev => ({ ...prev, patientGroups: prev.patientGroups.map(g => g.id === id ? { ...g, ...updates } : g) }));
  const removePatientGroup = (id: string) => setState(prev => ({ ...prev, patientGroups: prev.patientGroups.filter(g => g.id !== id) }));
  const addReceptionCard = (card: ReceptionCard) => setState(prev => ({ ...prev, receptionCards: [...(prev.receptionCards || []), card] }));
  const updateReceptionCard = (id: string, updates: Partial<ReceptionCard>) => setState(prev => ({ ...prev, receptionCards: (prev.receptionCards || []).map(c => c.id === id ? { ...c, ...updates } : c) }));
  const removeReceptionCard = (id: string) => setState(prev => ({ ...prev, receptionCards: (prev.receptionCards || []).filter(c => c.id !== id) }));
  const removeReceptionCards = (ids: string[]) => setState(prev => ({ ...prev, receptionCards: (prev.receptionCards || []).filter(c => !ids.includes(c.id)) }));
  const reorderReceptionCards = (newOrder: ReceptionCard[]) => setState(prev => ({ ...prev, receptionCards: newOrder }));
  const toggleCounterStatus = (counterId: string) => setState(prev => ({ ...prev, counters: prev.counters.map(c => c.id === counterId ? { ...c, isOnline: !c.isOnline } : c) }));
  const clearTokens = () => setState(prev => ({ ...prev, tokens: [] }));
  const factoryReset = () => { localStorage.removeItem(STORAGE_KEY_STATE); localStorage.removeItem(STORAGE_KEY_ROLE); localStorage.removeItem(STORAGE_KEY_SERVER_IP); localStorage.removeItem(STORAGE_KEY_BOUND_COUNTER); setState(getDefaults()); setDeviceRoleState('UNSET'); setBoundCounterId(null); };
  const seedDatabase = () => { setState(prev => ({ ...prev, departments: INITIAL_DEPTS, counters: INITIAL_COUNTERS, tokens: [], patientGroups: INITIAL_GROUPS, receptionCards: INITIAL_RECEPTION_CARDS })); };
  const clearUserData = () => { setState(prev => ({ ...prev, departments: [], counters: [], tokens: [], patientGroups: [], receptionCards: [] })); };
  const resetDepartments = () => { setState(prev => ({ ...prev, departments: INITIAL_DEPTS })); };
  const resetClinicSettings = () => { setState(prev => ({ ...prev, clinicName: 'CMH, Quetta (QMS)', clinicNameUrdu: 'سی ایم ایچ، کوئٹہ (کیو ایم ایس)', kioskTitle: 'CMH, Quetta (QMS)', kioskSubTitle: 'سی ایم ایچ، کوئٹہ (کیو ایم ایس)', kioskWelcomeText: 'Welcome to', printSettings: getDefaults().printSettings, kioskImageSettings: getDefaults().kioskImageSettings })); };

  return (
    <QueueContext.Provider value={{ 
      state, isEditMode, isNetworkSync, isOnline, deviceRole, boundCounterId, setDeviceRole, bindDevice, unbindDevice, setIsEditMode, setServerIp, addToken, updateTokenStatus, updateTokenData,
      addDepartment, updateDepartment, removeDepartment, addCounter, updateCounter, 
      removeCounter, addPatientGroup, updatePatientGroup, removePatientGroup, toggleCounterStatus, 
      clearTokens, factoryReset, callNextToken, releaseCounterTokens, transferToken,
      updateClinicDetails, updateKioskBranding, updateKioskImage, updateClinicLogo, updateKioskImageSettings, updateSystemLanguage,
      updatePrintSettings, updateDisplayMode, toggleShowRoomNumber, updateAdminPin,
      seedDatabase, clearUserData, resetDepartments, resetClinicSettings, updateAnnouncementVoice, updateAudioSource,
      addReceptionCard, updateReceptionCard, removeReceptionCard, removeReceptionCards, reorderReceptionCards, forceSync
    }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error("useQueue must be used within a QueueProvider");
  return context;
};
