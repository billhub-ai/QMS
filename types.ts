
export enum TokenStatus {
  WAITING = 'WAITING',
  SERVING = 'SERVING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  ON_HOLD = 'ON_HOLD',
  DEFERRED = 'DEFERRED',
  ADMITTED = 'ADMITTED',
  DISCHARGED = 'DISCHARGED',
  REFERRED = 'REFERRED',
  TRANSFERRED = 'TRANSFERRED'
}

export enum Gender {
  NONE = 'NONE',
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export type SystemLanguage = 'ENGLISH' | 'URDU' | 'BOTH';
export type DisplayMode = 'DEPARTMENT' | 'CLINIC';
export type DeviceRole = 'ADMIN' | 'KIOSK' | 'RECEPTION' | 'COUNTER' | 'DISPLAY' | 'ROOM_DISPLAY' | 'DOOR_DISPLAY' | 'UNSET';
export type AudioSourceType = 'BROWSER_TTS' | 'SERVER_FILE' | 'GEMINI_TTS';
export type Direction = 'LEFT' | 'RIGHT' | 'STRAIGHT' | 'NONE';

export interface PatientGroup {
  id: string;
  name: string;
  nameUrdu: string;
  priority: number; // 1 = Highest, 10 = Lowest
  color: string;
  icon?: string;
  customIcon?: string; // Base64 or URL for custom SVG/Image
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  nameUrdu?: string;
  prefix: string;
  isGenderSeparated: boolean;
  hasSeparateGenderTokenSequences?: boolean;
  showGenderPrefix?: boolean;
  showDeptPrefix?: boolean;
  color: string;
  icon?: string;
  customIcon?: string; // Base64 or URL for custom SVG/Image
  showEnglish?: boolean; 
  showUrdu?: boolean;    
  isActive?: boolean;
  allowedPatientGroups?: string[]; // If empty/undefined, all groups are allowed
}

export interface Counter {
  id: string;
  name: string;
  roomNumber?: string;
  departmentId: string;
  isOnline: boolean;
  servedGender?: Gender;
  servedPatientGroupId?: string; // Optional restriction to a specific group
  doctorName?: string;
  direction?: Direction; // Direction from reception
  receptionCardId?: string; // Links this counter to a specific reception card policy/sequence
}

export interface Token {
  id: string;
  ticketNumber: string;
  rawNumber: number;
  departmentId: string;
  patientGroupId?: string; // Link to PatientGroup
  status: TokenStatus;
  gender: Gender;
  createdAt: number;
  servedAt?: number;      // Last time called to counter (for session timer)
  firstServedAt?: number; // First time called to counter (for wait time stats)
  completedAt?: number;
  counterId?: string;
  isEmergency?: boolean;
  isRecalled?: boolean;
  recallCount?: number;
  referredToDeptId?: string;
  totalDuration?: number;
  sequenceKey?: string; // Identifier for independent counting streams
}

export interface ReceptionCard {
  id: string;
  label: string;
  subLabel: string;
  deptId: string;
  gender: Gender;
  patientGroupIds: string[]; // Changed to array for multiple/all selection
  color: string;
  icon: string;
  sequenceKey: string; // If two cards share this, they share the token count
  isActive: boolean;
}

export interface KioskImageSettings {
  widthPercent: number;
  verticalAlign: 'start' | 'center' | 'end';
  horizontalAlign: 'start' | 'center' | 'end';
  containerWidthPercent: number;
}

export interface PrintSettings {
  clinicNameSize: number;
  deptNameSize: number;
  tokenNumberSize: number;
  dateSize: number;
  footerSize: number;
  lineSpacing: number;
  textAlign: 'left' | 'center' | 'right';
  showClinicName: boolean;
  showGender: boolean;
  showDate: boolean;
  showDepartment: boolean;
  showTokenNumber: boolean;
  showFooter: boolean;
  footerText: string;
  footerTextUrdu: string;
  showPatientGroup?: boolean;
}

export interface AppState {
  departments: Department[];
  counters: Counter[];
  tokens: Token[];
  patientGroups: PatientGroup[];
  receptionCards: ReceptionCard[]; // New Field
  clinicName: string;
  clinicNameUrdu: string;
  kioskWelcomeText?: string;
  kioskTitle?: string;
  kioskSubTitle?: string;
  kioskImage?: string;
  logo?: string;
  kioskImageSettings: KioskImageSettings;
  systemLanguage: SystemLanguage;
  printSettings: PrintSettings;
  displayMode: DisplayMode;
  showRoomNumberInDisplay: boolean;
  adminPin: string;
  serverIp?: string;
  lastResetDate?: string;
  announcementVoiceURI?: string; 
  audioSource?: AudioSourceType; // Preference for audio source
  lastUpdated: number; // Timestamp for simple conflict resolution
  dataVersion: number; // Logical clock for strict state versioning
}
