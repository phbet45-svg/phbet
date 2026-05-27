import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  initializeAuth,
  inMemoryPersistence
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  Timestamp,
  addDoc
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { UserProfile, Match, Bet, League, SyncLog, SystemConfig } from "../types";

// Setup standard firebase client connection
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: Required by build platform */
export const auth = getAuth(app);

// Check if we are running in a mock fallback state (ToS not accepted yet or dummy credentials in use)
export const isMockEnvironment = firebaseConfig.apiKey === "mock-api-key" || firebaseConfig.projectId === "ph-bet-mock";

// Helper to create an auth user on a secondary Firebase app so the active admin session is not signed out
export async function createAuthUserWithoutSignout(email: string, pass: string): Promise<string> {
  if (isMockEnvironment) {
    return "mock_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
  }
  const secondaryAppName = `SecondaryApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = initializeAuth(secondaryApp, {
    persistence: inMemoryPersistence
  });
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}

// FIRESTORE ERROR HANDLING OBJECT PATTERNS
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  console.error('[PH_BET FireStore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ==========================================
// HIGH SOUNDNESS MOCK DATABASE SEEDING & STORAGE
// ==========================================
const MOCK_STORAGE_KEYS = {
  USERS: "phbet_mock_users",
  MATCHES: "phbet_mock_matches",
  BETS: "phbet_mock_bets",
  LEAGUES: "phbet_mock_leagues",
  SYNC_LOGS: "phbet_mock_sync_logs",
  SYSTEM_CONFIG: "phbet_mock_system_config",
};

// Initial Mock Leagues
const INITIAL_LEAGUES: League[] = [
  { id: "brasileirao", name: "Brasileirão Série A", isActive: true },
  { id: "champions", name: "Champions League", isActive: true },
  { id: "libertadores", name: "Copa Libertadores", isActive: true },
  { id: "premier_league", name: "Premier League", isActive: true },
];

// Initial Mock Matches (Pre-populated)
const INITIAL_MATCHES: Match[] = [
  {
    id: "m1",
    homeTeam: "Flamengo",
    awayTeam: "Palmeiras",
    date: new Date().toISOString().split("T")[0],
    league: "Brasileirão Série A",
    isActive: true,
    odds: { homeWins: 1.95, draw: 3.20, awayWins: 3.50 },
    status: "pending",
    result: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "m2",
    homeTeam: "Real Madrid",
    awayTeam: "Manchester City",
    date: new Date().toISOString().split("T")[0],
    league: "Champions League",
    isActive: true,
    odds: { homeWins: 2.20, draw: 3.40, awayWins: 2.80 },
    status: "pending",
    result: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "m3",
    homeTeam: "Boca Juniors",
    awayTeam: "River Plate",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    league: "Copa Libertadores",
    isActive: true,
    odds: { homeWins: 2.40, draw: 3.00, awayWins: 2.90 },
    status: "pending",
    result: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "m4",
    homeTeam: "Arsenal",
    awayTeam: "Chelsea",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    league: "Premier League",
    isActive: true,
    odds: { homeWins: 1.65, draw: 3.80, awayWins: 5.00 },
    status: "pending",
    result: null,
    createdAt: new Date().toISOString()
  },
  {
    id: "m5",
    homeTeam: "São Paulo",
    awayTeam: "Corinthians",
    date: new Date().toISOString().split("T")[0],
    league: "Brasileirão Série A",
    isActive: true,
    odds: { homeWins: 2.05, draw: 3.10, awayWins: 3.60 },
    status: "pending",
    result: null,
    createdAt: new Date().toISOString()
  }
];

// Initial Mock Users (Admin, Cambista, Cliente)
const INITIAL_USERS: UserProfile[] = [
  {
    uid: "admin123",
    name: "PH Admin (Banca)",
    email: "admin@phbet.com",
    phone: "11999999999",
    role: "admin",
    status: "active",
    commissionPercentage: 0,
    createdAt: new Date().toISOString()
  },
  {
    uid: "cambista123",
    name: "Ramon Cambista",
    email: "ramon@phbet.com",
    phone: "11988888888",
    role: "cambista",
    status: "active",
    commissionPercentage: 15,
    createdAt: new Date().toISOString()
  },
  {
    uid: "cliente123",
    name: "Antônio Apostador",
    email: "antonio@phbet.com",
    phone: "11977777777",
    role: "cliente",
    status: "active",
    commissionPercentage: 0,
    createdAt: new Date().toISOString()
  }
];

const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  houseMargin: 10, // 10%
  apiUrl: "https://api.api-football.com/v3",
  apiKey: "PH-API-FOOTBALL-FREE-KEY-2026",
};

// Initialize Mock state helper to seed data
function initLocalStorageMock() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.USERS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.MATCHES)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.MATCHES, JSON.stringify(INITIAL_MATCHES));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.LEAGUES)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.LEAGUES, JSON.stringify(INITIAL_LEAGUES));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.BETS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.BETS, JSON.stringify([]));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.SYNC_LOGS)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.SYNC_LOGS, JSON.stringify([]));
  }
  if (!localStorage.getItem(MOCK_STORAGE_KEYS.SYSTEM_CONFIG)) {
    localStorage.setItem(MOCK_STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(INITIAL_SYSTEM_CONFIG));
  }
}
initLocalStorageMock();

// Storage helper functions
export function getMockData<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMockData<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Single-document helper
export function getMockDoc<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMockDoc<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}
