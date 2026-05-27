import { 
  db, 
  auth, 
  isMockEnvironment, 
  handleFirestoreError, 
  OperationType,
  getMockData,
  saveMockData,
  getMockDoc,
  saveMockDoc
} from "./firebase";
import { UserProfile, Match, MatchOdds, Bet, League, SyncLog, SystemConfig } from "../types";
import { 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  addDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

// Mock key mapping constants
const KEYS = {
  USERS: "phbet_mock_users",
  MATCHES: "phbet_mock_matches",
  BETS: "phbet_mock_bets",
  LEAGUES: "phbet_mock_leagues",
  SYNC_LOGS: "phbet_mock_sync_logs",
  SYSTEM_CONFIG: "phbet_mock_system_config",
};

// Simple Client Realtime Event Bus for the local storage mock mode
type ListenerCallback = () => void;
class MockEventBus {
  private listeners: { [event: string]: ListenerCallback[] } = {};

  subscribe(event: string, callback: ListenerCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  notify(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb());
    }
  }
}
export const mockEventBus = new MockEventBus();

// ==========================================
// REMOTE DATABASE INITIAL SEEDING
// ==========================================
let seedingPromise: Promise<void> | null = null;

export async function ensureDatabaseSeeded(): Promise<void> {
  if (isMockEnvironment) return;
  if (seedingPromise) return seedingPromise;
  
  seedingPromise = (async () => {
    try {
      const configRef = doc(db, "system_config", "general");
      const configSnap = await getDoc(configRef);
      if (!configSnap.exists()) {
        console.log("[PH_BET] Seed starting: Real Cloud Firestore detected empty. Bootstrapping...");
        
        // 1. Seed System Config
        const seedConfig: SystemConfig = {
          houseMargin: 10,
          apiUrl: "https://api.api-football.com/v3",
          apiKey: "PH-API-FOOTBALL-FREE-KEY-2026",
        };
        await setDoc(configRef, seedConfig);

        // 2. Seed Leagues
        const INITIAL_LEAGUES: League[] = [
          { id: "brasileirao", name: "Brasileirão Série A", isActive: true },
          { id: "champions", name: "Champions League", isActive: true },
          { id: "libertadores", name: "Copa Libertadores", isActive: true },
          { id: "premier_league", name: "Premier League", isActive: true },
        ];
        for (const league of INITIAL_LEAGUES) {
          await setDoc(doc(db, "leagues", league.id), league);
        }

        // 3. Seed Matches
        const INITIAL_MATCHES: Match[] = [
          {
            id: "m1",
            homeTeam: "Flamengo",
            awayTeam: "Palmeiras",
            date: new Date().toISOString().split("T")[0],
            league: "Brasileirão Série A",
            isActive: true,
            odds: { 
              homeWins: 1.95, draw: 3.20, awayWins: 3.50,
              over95_corners: 1.85, under95_corners: 1.85,
              over105_corners: 2.15, under105_corners: 1.62,
              over115_corners: 2.60, under115_corners: 1.40,
              over55_cards: 1.75, under55_cards: 1.95
            },
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
            odds: { 
              homeWins: 2.20, draw: 3.40, awayWins: 2.80,
              over95_corners: 1.80, under95_corners: 1.90,
              over105_corners: 2.10, under105_corners: 1.65,
              over115_corners: 2.50, under115_corners: 1.45,
              over55_cards: 1.80, under55_cards: 1.90
            },
            status: "pending",
            result: null,
            createdAt: new Date().toISOString()
          },
          {
            id: "m3",
            homeTeam: "Boca Juniors",
            awayTeam: "River Plate",
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            league: "Copa Libertadores",
            isActive: true,
            odds: { 
              homeWins: 2.40, draw: 3.00, awayWins: 2.90,
              over95_corners: 1.90, under95_corners: 1.80,
              over105_corners: 2.20, under105_corners: 1.60,
              over115_corners: 2.70, under115_corners: 1.35,
              over55_cards: 1.65, under55_cards: 2.10
            },
            status: "pending",
            result: null,
            createdAt: new Date().toISOString()
          },
          {
            id: "m4",
            homeTeam: "Arsenal",
            awayTeam: "Chelsea",
            date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
            league: "Premier League",
            isActive: true,
            odds: { 
              homeWins: 1.65, draw: 3.80, awayWins: 5.00,
              over95_corners: 1.75, under95_corners: 1.95,
              over105_corners: 2.05, under105_corners: 1.70,
              over115_corners: 2.45, under115_corners: 1.48,
              over55_cards: 1.85, under55_cards: 1.85
            },
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
            odds: { 
              homeWins: 2.05, draw: 3.10, awayWins: 3.60,
              over95_corners: 1.85, under95_corners: 1.85,
              over105_corners: 2.15, under105_corners: 1.62,
              over115_corners: 2.60, under115_corners: 1.40,
              over55_cards: 1.70, under55_cards: 2.00
            },
            status: "pending",
            result: null,
            createdAt: new Date().toISOString()
          }
        ];
        for (const match of INITIAL_MATCHES) {
          await setDoc(doc(db, "matches", match.id), match);
        }

        // 4. Seed Profiles
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
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, "users", u.uid), u);
        }
        console.log("[PH_BET] Firestore Seeding COMPLETE!");
      }
    } catch (err) {
      console.error("[PH_BET] Seed database error:", err);
    }
  })();
  return seedingPromise;
}

// ==========================================
// USER SERVICES
// ==========================================

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    return list.find(u => u.uid === uid) || null;
  }
  
  await ensureDatabaseSeeded();
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    const filtered = list.filter(u => u.uid !== profile.uid);
    filtered.push(profile);
    saveMockData(KEYS.USERS, filtered);
    mockEventBus.notify("users");
    return;
  }
  
  const path = `users/${profile.uid}`;
  try {
    const ref = doc(db, "users", profile.uid);
    await setDoc(ref, profile);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function findProfileByIdentifier(identifier: string): Promise<UserProfile | null> {
  const normalized = identifier.toLowerCase().trim();
  const phoneNormalized = normalized.replace(/\s+/g, "");

  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    return list.find(u => 
      u.email.toLowerCase() === normalized || 
      u.phone.replace(/\s+/g, "") === phoneNormalized
    ) || null;
  }

  try {
    // Try email first
    const qEmail = query(collection(db, "users"), where("email", "==", normalized));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) return snapEmail.docs[0].data() as UserProfile;

    // Try phone
    const qPhone = query(collection(db, "users"), where("phone", "==", normalized));
    const snapPhone = await getDocs(qPhone);
    if (!snapPhone.empty) return snapPhone.docs[0].data() as UserProfile;

    return null;
  } catch (error) {
    console.warn("[PH_BET] Identifier lookup failed, might be permission restricted:", error);
    return null;
  }
}

export async function getUsers(): Promise<UserProfile[]> {
  if (isMockEnvironment) {
    return getMockData<UserProfile>(KEYS.USERS);
  }
  
  await ensureDatabaseSeeded();
  const path = "users";
  try {
    const ref = collection(db, "users");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getActiveCambistas(): Promise<UserProfile[]> {
  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    return list.filter(u => u.role === "cambista" && u.status === "active");
  }
  
  await ensureDatabaseSeeded();
  const path = "users (active cambistas)";
  try {
    const q = query(
      collection(db, "users"), 
      where("role", "==", "cambista"), 
      where("status", "==", "active"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    const updated = list.map(u => u.uid === uid ? { ...u, ...data } : u);
    saveMockData(KEYS.USERS, updated);
    mockEventBus.notify("users");
    mockEventBus.notify("bets"); // Commission or names may impact profiles
    return;
  }
  
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, data);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<UserProfile>(KEYS.USERS);
    const filtered = list.filter(u => u.uid !== uid);
    saveMockData(KEYS.USERS, filtered);
    mockEventBus.notify("users");
    mockEventBus.notify("bets");
    return;
  }
  
  const path = `users/${uid}`;
  try {
    const ref = doc(db, "users", uid);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==========================================
// MATCH SERVICES
// ==========================================

export async function getMatches(): Promise<Match[]> {
  if (isMockEnvironment) {
    return getMockData<Match>(KEYS.MATCHES);
  }
  
  await ensureDatabaseSeeded();
  const path = "matches";
  try {
    const ref = collection(db, "matches");
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data() as Match);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Helper to remove undefined fields recursively to prevent Firestore errors
function cleanObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanObject(v));
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        newObj[key] = cleanObject(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

export async function saveMatch(match: Match): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<Match>(KEYS.MATCHES);
    const filtered = list.filter(m => m.id !== match.id);
    filtered.push(match);
    saveMockData(KEYS.MATCHES, filtered);
    mockEventBus.notify("matches");
    return;
  }
  
  const path = `matches/${match.id}`;
  try {
    const ref = doc(db, "matches", match.id);
    await setDoc(ref, cleanObject(match));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateMatchStatus(
  matchId: string, 
  status: "pending" | "finished" | "cancelled", 
  result: "home" | "draw" | "away" | null,
  corners?: number,
  cards?: number
): Promise<void> {
  const finalCorners = corners !== undefined ? corners : null;
  const finalCards = cards !== undefined ? cards : null;

  if (isMockEnvironment) {
    const list = getMockData<Match>(KEYS.MATCHES);
    const updated = list.map(m => m.id === matchId ? { 
      ...m, 
      status, 
      result,
      footballCorners: finalCorners,
      footballCards: finalCards
    } : m);
    saveMockData(KEYS.MATCHES, updated);
    mockEventBus.notify("matches");
    
    // Resolve bets that include this match
    await resolveBetsOnMatchFinish(matchId, status, result);
    return;
  }
  
  const path = `matches/${matchId}`;
  try {
    const ref = doc(db, "matches", matchId);
    await updateDoc(ref, { 
      status, 
      result,
      footballCorners: finalCorners,
      footballCards: finalCards
    });
    await resolveBetsOnMatchFinish(matchId, status, result);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ==========================================
// LEAGUE SERVICES
// ==========================================

export async function getLeagues(): Promise<League[]> {
  if (isMockEnvironment) {
    return getMockData<League>(KEYS.LEAGUES);
  }
  
  await ensureDatabaseSeeded();
  const path = "leagues";
  try {
    const ref = collection(db, "leagues");
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data() as League);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveLeague(league: League): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<League>(KEYS.LEAGUES);
    const filtered = list.filter(l => l.id !== league.id);
    filtered.push(league);
    saveMockData(KEYS.LEAGUES, filtered);
    mockEventBus.notify("leagues");
    return;
  }
  
  const path = `leagues/${league.id}`;
  try {
    const ref = doc(db, "leagues", league.id);
    await setDoc(ref, league);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// SYSTEM CONFIG SERVICES
// ==========================================

export async function getSystemConfig(): Promise<SystemConfig> {
  if (isMockEnvironment) {
    const docData = getMockDoc<SystemConfig>(KEYS.SYSTEM_CONFIG);
    return docData || { houseMargin: 10, apiUrl: "", apiKey: "" };
  }
  
  await ensureDatabaseSeeded();
  const path = "system_config/general";
  try {
    const ref = doc(db, "system_config", "general");
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as SystemConfig;
    }
    return { houseMargin: 10, apiUrl: "", apiKey: "" };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSystemConfig(config: SystemConfig): Promise<void> {
  if (isMockEnvironment) {
    saveMockDoc(KEYS.SYSTEM_CONFIG, config);
    mockEventBus.notify("system_config");
    return;
  }
  
  const path = "system_config/general";
  try {
    const ref = doc(db, "system_config", "general");
    await setDoc(ref, config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// SYNC LOG SERVICES
// ==========================================

export async function getSyncLogs(): Promise<SyncLog[]> {
  if (isMockEnvironment) {
    return getMockData<SyncLog>(KEYS.SYNC_LOGS);
  }
  
  const path = "sync_logs";
  try {
    const ref = collection(db, "sync_logs");
    const snap = await getDocs(ref);
    return snap.docs.map(d => d.data() as SyncLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addSyncLog(log: Omit<SyncLog, "id">): Promise<void> {
  const id = `log_${Date.now()}`;
  const fullLog: SyncLog = { ...log, id };
  
  if (isMockEnvironment) {
    const list = getMockData<SyncLog>(KEYS.SYNC_LOGS);
    list.unshift(fullLog); // latest logo first
    saveMockData(KEYS.SYNC_LOGS, list.slice(0, 100)); // limit 100
    mockEventBus.notify("sync_logs");
    return;
  }
  
  const path = `sync_logs/${id}`;
  try {
    const ref = doc(db, "sync_logs", id);
    await setDoc(ref, fullLog);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// INDEXED SPORTS DATA SYNC SIMULATION/MANUAL
// ==========================================

export function calculateOddsWithMargin(
  rawOdds: MatchOdds, 
  houseMargin: number, 
  leagueName: string, 
  leagueMargins?: Record<string, number>, 
  matchMarginOverride?: number
): MatchOdds {
  let margin = houseMargin;
  if (matchMarginOverride !== undefined && matchMarginOverride !== null && !isNaN(matchMarginOverride)) {
    margin = matchMarginOverride;
  } else if (leagueMargins && leagueMargins[leagueName] !== undefined && leagueMargins[leagueName] !== null) {
    margin = leagueMargins[leagueName];
  }
  
  const multiplier = Math.max(0.4, (100 - margin) / 100);
  
  return {
    homeWins: parseFloat(Math.max(1.01, rawOdds.homeWins * multiplier).toFixed(2)),
    draw: parseFloat(Math.max(1.01, rawOdds.draw * multiplier).toFixed(2)),
    awayWins: parseFloat(Math.max(1.01, rawOdds.awayWins * multiplier).toFixed(2)),
    over95_corners: rawOdds.over95_corners ? parseFloat(Math.max(1.01, rawOdds.over95_corners * multiplier).toFixed(2)) : undefined,
    under95_corners: rawOdds.under95_corners ? parseFloat(Math.max(1.01, rawOdds.under95_corners * multiplier).toFixed(2)) : undefined,
    over105_corners: rawOdds.over105_corners ? parseFloat(Math.max(1.01, rawOdds.over105_corners * multiplier).toFixed(2)) : undefined,
    under105_corners: rawOdds.under105_corners ? parseFloat(Math.max(1.01, rawOdds.under105_corners * multiplier).toFixed(2)) : undefined,
    over115_corners: rawOdds.over115_corners ? parseFloat(Math.max(1.01, rawOdds.over115_corners * multiplier).toFixed(2)) : undefined,
    under115_corners: rawOdds.under115_corners ? parseFloat(Math.max(1.01, rawOdds.under115_corners * multiplier).toFixed(2)) : undefined,
    over55_cards: rawOdds.over55_cards ? parseFloat(Math.max(1.01, rawOdds.over55_cards * multiplier).toFixed(2)) : undefined,
    under55_cards: rawOdds.under55_cards ? parseFloat(Math.max(1.01, rawOdds.under55_cards * multiplier).toFixed(2)) : undefined,
  };
}

export async function triggerSportsApiSync(): Promise<{ success: boolean; count: number }> {
  const config = await getSystemConfig();
  const houseMargin = config.houseMargin;
  const leagueMargins = config.leagueMargins || {};
  
  // Create simulated match list imports with odds adjusted by our margin
  const rawFixtures = [
    {
      homeTeam: "Flamengo",
      awayTeam: "Palmeiras",
      league: "Brasileirão Série A",
      daysOffset: 0,
      rawOdds: {
        homeWins: 2.10, draw: 3.30, awayWins: 3.40,
        over95_corners: 1.85, under95_corners: 1.85,
        over105_corners: 2.10, under105_corners: 1.65,
        over55_cards: 1.75, under55_cards: 1.95
      }
    },
    {
      homeTeam: "Real Madrid",
      awayTeam: "Manchester City",
      league: "Champions League",
      daysOffset: 1,
      rawOdds: {
        homeWins: 2.30, draw: 3.50, awayWins: 2.80,
        over95_corners: 1.75, under95_corners: 1.95,
        over105_corners: 2.05, under105_corners: 1.70,
        over55_cards: 1.85, under55_cards: 1.85
      }
    },
    {
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      league: "Premier League",
      daysOffset: 1,
      rawOdds: {
        homeWins: 3.20, draw: 3.40, awayWins: 2.10,
        over95_corners: 1.90, under95_corners: 1.80,
        over105_corners: 2.25, under105_corners: 1.55,
        over55_cards: 1.65, under55_cards: 2.10
      }
    },
    {
      homeTeam: "River Plate",
      awayTeam: "São Paulo",
      league: "Copa Libertadores",
      daysOffset: 2,
      rawOdds: {
        homeWins: 1.95, draw: 3.20, awayWins: 3.80,
        over95_corners: 1.80, under95_corners: 1.90,
        over105_corners: 2.15, under105_corners: 1.62,
        over55_cards: 1.70, under55_cards: 2.00
      }
    },
    {
      homeTeam: "LDU Quito",
      awayTeam: "Fortaleza",
      league: "Copa Sul-Americana",
      daysOffset: 2,
      rawOdds: {
        homeWins: 1.80, draw: 3.50, awayWins: 4.20,
        over95_corners: 1.85, under95_corners: 1.85,
        over55_cards: 1.80, under55_cards: 1.90
      }
    },
    {
      homeTeam: "Barcelona",
      awayTeam: "Atlético de Madrid",
      league: "La Liga",
      daysOffset: 3,
      rawOdds: {
        homeWins: 1.90, draw: 3.40, awayWins: 3.60,
        over95_corners: 1.80, under95_corners: 1.90,
        over55_cards: 1.75, under55_cards: 1.95
      }
    },
    {
      homeTeam: "Inter Milan",
      awayTeam: "Juventus",
      league: "Serie A Italiana",
      daysOffset: 4,
      rawOdds: {
        homeWins: 2.00, draw: 3.20, awayWins: 3.70,
        over95_corners: 1.85, under95_corners: 1.85,
        over55_cards: 1.80, under55_cards: 1.90
      }
    }
  ];

  const importedMatches: Match[] = rawFixtures.map((fix) => {
    const margin = leagueMargins[fix.league] ?? houseMargin;
    const computedOdds = calculateOddsWithMargin(fix.rawOdds, houseMargin, fix.league, leagueMargins);
    
    return {
      id: "api_sync_" + fix.homeTeam.toLowerCase().replace(/\s+/g, "_") + "_" + Math.floor(Math.random() * 10000),
      homeTeam: fix.homeTeam,
      awayTeam: fix.awayTeam,
      date: new Date(Date.now() + fix.daysOffset * 86400000).toISOString().split("T")[0],
      league: fix.league,
      isActive: true,
      rawOdds: fix.rawOdds,
      odds: computedOdds,
      status: "pending",
      result: null,
      createdAt: new Date().toISOString()
    };
  });

  // Save imported games & ensure leagues are present
  const allLeagues = await getLeagues();
  for (const match of importedMatches) {
    await saveMatch(match);
    const lExists = allLeagues.some(l => l.name.toLowerCase() === match.league.toLowerCase());
    if (!lExists) {
      const newLeague = {
        id: "league_" + match.league.toLowerCase().replace(/[\s\W]+/g, "_"),
        name: match.league,
        isActive: true
      };
      await saveLeague(newLeague);
      allLeagues.push(newLeague);
    }
  }

  await addSyncLog({
    timestamp: new Date().toISOString(),
    status: "success",
    importedCount: importedMatches.length,
    details: `Sincronização manual executada com sucesso. Copas do Brasil, Libertadores, Sul-Americana, Champions e Ligas Europeias importadas. Margem Geral Aplicada: ${houseMargin}%.`
  });

  return {
    success: true,
    count: importedMatches.length
  };
}


// ==========================================
// BET SERVICES (INCLUDING COMMISSION TOKENS)
// ==========================================

export async function getBets(): Promise<Bet[]> {
  if (isMockEnvironment) {
    return getMockData<Bet>(KEYS.BETS);
  }
  
  const path = "bets";
  try {
    const ref = collection(db, "bets");
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bet));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getBetsByCambista(cambistaId: string, limitCount = 200): Promise<Bet[]> {
  if (isMockEnvironment) {
    const all = getMockData<Bet>(KEYS.BETS);
    return all.filter(b => b.cambistaId === cambistaId);
  }
  if (!auth.currentUser) {
    console.log("[PH_BET] getBetsByCambista skipped - unauthenticated user session");
    return [];
  }
  
  const path = `bets (cambista: ${cambistaId})`;
  try {
    const q = query(
      collection(db, "bets"), 
      where("cambistaId", "==", cambistaId),
      orderBy("createdAt", "desc"),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bet));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getBetById(id: string): Promise<Bet | null> {
  if (isMockEnvironment) {
    const all = getMockData<Bet>(KEYS.BETS);
    return all.find(b => b.id === id) || null;
  }
  try {
    const docRef = doc(db, "bets", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { ...snap.data(), id: snap.id } as Bet;
  } catch (error) {
    console.error("Error getting bet by id:", error);
    return null;
  }
}

export async function getBetByPin(pin: string): Promise<Bet | null> {
  if (isMockEnvironment) {
    const all = getMockData<Bet>(KEYS.BETS);
    return all.find(b => b.pin === pin) || null;
  }
  
  const path = `bets (pin: ${pin})`;
  try {
    const q = query(
      collection(db, "bets"), 
      where("pin", "==", pin), 
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as Bet;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function getPendingBetsByCustomer(customerPhone: string, userId: string | null): Promise<Bet[]> {
  if (isMockEnvironment) {
    const list = getMockData<Bet>(KEYS.BETS);
    return list.filter(b => 
      b.status === "pendente_recuperacao" && 
      ((customerPhone && customerPhone !== "Não Informado" && b.customerPhone === customerPhone) || 
       (userId && b.userId === userId))
    );
  }

  const path = `bets (pending query for phone: ${customerPhone || "N/A"}, userId: ${userId || "N/A"})`;
  try {
    if (customerPhone && customerPhone !== "Não Informado") {
      const q = query(
        collection(db, "bets"),
        where("customerPhone", "==", customerPhone),
        where("status", "==", "pendente_recuperacao")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bet));
    } else if (userId) {
      const q = query(
        collection(db, "bets"),
        where("userId", "==", userId),
        where("status", "==", "pendente_recuperacao")
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Bet));
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function placeBet(bet: Bet): Promise<void> {
  // Save placing logic
  if (isMockEnvironment) {
    const list = getMockData<Bet>(KEYS.BETS);
    list.push(bet);
    saveMockData(KEYS.BETS, list);
    
    // Trigger event listeners
    mockEventBus.notify("bets");
    mockEventBus.notify("users");
    return;
  }
  
  const path = `bets/${bet.id}`;
  try {
    const ref = doc(db, "bets", bet.id);
    await setDoc(ref, bet);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Generate unique commission token using readable format (e.g. "COM-HASH")
export function generateCommissionToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let hash = "";
  for (let i = 0; i < 8; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `COM-${hash}`;
}

// ==========================================
// REAL-TIME WIN/LOSS BET SETTLEMENT ENGINE
// ==========================================

/**
 * Resolves bets when an individual match results are posted
 */
export async function resolveBetsOnMatchFinish(
  matchId: string, 
  matchStatus: "pending" | "finished" | "cancelled", 
  matchResult: "home" | "draw" | "away" | null
) {
  const bets = await getBets();
  const allMatches = await getMatches();
  const targetMatch = allMatches.find(m => m.id === matchId);
  const corners = targetMatch?.footballCorners ?? 0;
  const cards = targetMatch?.footballCards ?? 0;
  
  for (const bet of bets) {
    let hasChanged = false;
    
    // Complete matches loop in bet
    const updatedSubMatches = bet.matches.map(sm => {
      if (sm.matchId === matchId) {
        hasChanged = true;
        // Determine single status:
        let outcome: "pending" | "won" | "lost" = "pending";
        if (matchStatus === "finished") {
          if (sm.prediction === "home" || sm.prediction === "draw" || sm.prediction === "away") {
            outcome = (sm.prediction === matchResult) ? "won" : "lost";
          } else if (sm.prediction === "over95_corners") {
            outcome = corners > 9.5 ? "won" : "lost";
          } else if (sm.prediction === "under95_corners") {
            outcome = corners < 9.5 ? "won" : "lost";
          } else if (sm.prediction === "over105_corners") {
            outcome = corners > 10.5 ? "won" : "lost";
          } else if (sm.prediction === "under105_corners") {
            outcome = corners < 10.5 ? "won" : "lost";
          } else if (sm.prediction === "over115_corners") {
            outcome = corners > 11.5 ? "won" : "lost";
          } else if (sm.prediction === "under115_corners") {
            outcome = corners < 11.5 ? "won" : "lost";
          } else if (sm.prediction === "over55_cards") {
            outcome = cards > 5.5 ? "won" : "lost";
          } else if (sm.prediction === "under55_cards") {
            outcome = cards < 5.5 ? "won" : "lost";
          }
        } else if (matchStatus === "cancelled") {
          outcome = "won"; // standard tie or odd void, we count as won to simplify, or draw parity
        }
        return { ...sm, status: outcome };
      }
      return sm;
    });

    if (hasChanged) {
      // Evaluate overall bet status:
      // If ANY sub match is "lost" -> Entire bet is "lost"
      // If ALL sub matches are "won" -> Entire bet is "won"
      // Else -> remains "pending"
      let finalStatus: "pending" | "won" | "lost" | "cancelled" = "pending";
      
      const isAnyLost = updatedSubMatches.some(m => m.status === "lost");
      const isAllWon = updatedSubMatches.every(m => m.status === "won");
      
      if (isAnyLost) {
        finalStatus = "lost";
      } else if (isAllWon) {
        finalStatus = "won";
      }

      const commissionPercentage = bet.commissionPercentage ?? 0;
      const commissionValue = bet.commissionValue ?? 0;
      let finalCommissionStatus: "pending" | "validated" | "cancelled" = bet.commissionStatus;

      // Handle commission and balances once bet changes from pending
      if (finalStatus !== "pending" && bet.status === "pending") {
        // Validation occurs: 'A comissão só é validada/creditada após o resultado da aposta'
        finalCommissionStatus = (finalStatus === "won" || finalStatus === "lost") ? "validated" : "cancelled";
        
        // Let's release commissions to the Cambista!
        if (bet.cambistaId && finalCommissionStatus === "validated" && commissionValue > 0) {
          // Commission credit to cambista balance removed per user request
          console.log("Commission marked for validation:", commissionValue);
        }

        // Standard user payouts if won
        if (finalStatus === "won" && bet.userId) {
          // Payout credit to user balance removed per user request
          console.log("Payout marked for validation:", bet.potentialPayout);
        }
      }

      // Update actual bet document
      const updatedBet: Bet = {
        ...bet,
        matches: updatedSubMatches,
        status: finalStatus,
        commissionStatus: finalCommissionStatus
      };

      await forceUpdateBetDoc(updatedBet);
    }
  }
}

export async function updateBet(bet: Bet): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<Bet>(KEYS.BETS);
    const updated = list.map(b => b.id === bet.id ? bet : b);
    saveMockData(KEYS.BETS, updated);
    mockEventBus.notify("bets");
    return;
  }
  
  const path = `bets/${bet.id}`;
  try {
    const ref = doc(db, "bets", bet.id);
    await setDoc(ref, bet); // overwrite
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminResetEverything(): Promise<void> {
  console.log("adminResetEverything: Starting reset");
  
  if (isMockEnvironment) {
    saveMockData(KEYS.MATCHES, []);
    saveMockData(KEYS.BETS, []);
    saveMockData(KEYS.USERS, []); // Or keep users? Just matches and bets.
    mockEventBus.notify("matches");
    mockEventBus.notify("bets");
    console.log("adminResetEverything: Mock data reset successfully.");
    return;
  }
  
  // Use a batch for matches (paginated)
  let hasMoreMatches = true;
  while(hasMoreMatches) {
    const matchesRef = collection(db, "matches");
    const matchesSnap = await getDocs(query(matchesRef, limit(490)));
    console.log(`adminResetEverything: Found ${matchesSnap.size} matches to delete in this batch`);
    if (matchesSnap.size === 0) {
      hasMoreMatches = false;
      break;
    }
    const batch = writeBatch(db);
    for (const docSnap of matchesSnap.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
  
  // Use a batch for bets (paginated)
  let hasMoreBets = true;
  while(hasMoreBets) {
    const betsRef = collection(db, "bets");
    const betsSnap = await getDocs(query(betsRef, limit(490)));
    console.log(`adminResetEverything: Found ${betsSnap.size} bets to delete in this batch`);
    if (betsSnap.size === 0) {
      hasMoreBets = false;
      break;
    }
    const batch = writeBatch(db);
    for (const docSnap of betsSnap.docs) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
  
  console.log("adminResetEverything: Finished reset");
}

async function forceUpdateBetDoc(bet: Bet): Promise<void> {
  await updateBet(bet);
}

// ==========================================
// REAL-TIME SUBSCRIPTION WRAPPERS (FOR DECOUPLING IN REACT)
// ==========================================

export function subscribeToCollection(collectionName: "matches" | "users" | "bets" | "leagues" | "sync_logs", callback: () => void): () => void {
  if (isMockEnvironment) {
    return mockEventBus.subscribe(collectionName, callback);
  }

  try {
    const q = query(collection(db, collectionName));
    return onSnapshot(q, () => {
      callback();
    }, (err) => {
      // Don't noise log standard expected permission failures on users list
      if (collectionName === "users") {
        console.warn(`Snapshot subscription restricted for ${collectionName}`);
      } else {
        console.error(`Snapshot error on ${collectionName}:`, err);
      }
    });
  } catch (e) {
    console.error("Failed to map live onSnapshot, fallback to mock subscriber", e);
    return mockEventBus.subscribe(collectionName, callback);
  }
}

export function subscribeToActiveCambistas(callback: () => void): () => void {
  if (isMockEnvironment) {
    return mockEventBus.subscribe("users", callback);
  }
  try {
    const q = query(
      collection(db, "users"), 
      where("role", "==", "cambista"), 
      where("status", "==", "active"),
      limit(50)
    );
    return onSnapshot(q, () => {
      callback();
    }, (err) => {
      console.error(`Snapshot error on active cambistas:`, err);
    });
  } catch (e) {
    console.error("Failed to map live active cambistas onSnapshot, fallback to mock", e);
    return mockEventBus.subscribe("users", callback);
  }
}

export function subscribeToBetsByCambista(cambistaId: string, callback: () => void): () => void {
  if (isMockEnvironment) {
    return mockEventBus.subscribe("bets", callback);
  }
  if (!auth.currentUser) {
    console.log("[PH_BET] subscribeToBetsByCambista skipped - unauthenticated user session");
    return () => {};
  }
  try {
    const q = query(
      collection(db, "bets"), 
      where("cambistaId", "==", cambistaId),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    return onSnapshot(q, () => {
      callback();
    }, (err) => {
      console.error(`Snapshot error on bets for cambista ${cambistaId}:`, err);
    });
  } catch (e) {
    console.error("Failed to map live bets cambista onSnapshot, fallback to mock", e);
    return mockEventBus.subscribe("bets", callback);
  }
}

export async function linkBetToCambista(betId: string, cambistaId: string): Promise<void> {
  if (isMockEnvironment) {
    const list = getMockData<Bet>(KEYS.BETS);
    const updated = list.map(b => b.id === betId ? { ...b, cambistaId } : b);
    saveMockData(KEYS.BETS, updated);
    mockEventBus.notify("bets");
    return;
  }
  
  try {
    const ref = doc(db, "bets", betId);
    await updateDoc(ref, { cambistaId });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bets/${betId}`);
  }
}

export async function linkAllCustomerBetsToCambista(customerPhone: string, cambistaId: string): Promise<number> {
  let unassignedBets: Bet[] = [];
  
  if (isMockEnvironment) {
    const bets = await getBets();
    unassignedBets = bets.filter(b => b.customerPhone === customerPhone && !b.cambistaId);
  } else {
    const path = `bets (query phone: ${customerPhone})`;
    try {
      const q = query(
        collection(db, "bets"), 
        where("customerPhone", "==", customerPhone),
        limit(100)
      );
      const snap = await getDocs(q);
      unassignedBets = snap.docs
        .map(d => ({ ...d.data(), id: d.id } as Bet))
        .filter(b => !b.cambistaId); // Still filter locally for safety/simplification
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }
  
  let count = 0;
  for (const bet of unassignedBets) {
    await linkBetToCambista(bet.id, cambistaId);
    count++;
  }
  return count;
}

export function subscribeToUserProfile(uid: string, callback: () => void): () => void {
  if (isMockEnvironment) {
    return mockEventBus.subscribe("users", callback);
  }
  if (!auth.currentUser) {
    console.log("[PH_BET] subscribeToUserProfile skipped - unauthenticated user session");
    return () => {};
  }
  try {
    const docRef = doc(db, "users", uid);
    return onSnapshot(docRef, () => {
      callback();
    }, (err) => {
      console.error(`Snapshot error on user profile ${uid}:`, err);
    });
  } catch (e) {
    console.error("Failed to map live user profile onSnapshot, fallback to mock", e);
    return mockEventBus.subscribe("users", callback);
  }
}

export async function recoverBetByPinTransaction(pin: string, cambistaId: string): Promise<Bet> {
  const normalizedPin = pin.trim().toUpperCase();

  if (isMockEnvironment) {
    const bets = getMockData<Bet>(KEYS.BETS);
    const bet = bets.find(b => b.pin?.toUpperCase() === normalizedPin);
    if (!bet) throw new Error("Aposta com este PIN não existe.");
    if (bet.status !== "pendente_recuperacao") {
      throw new Error(`Aposta já recuperada ou status inválido (Status atual: ${bet.status}).`);
    }

    const users = getMockData<UserProfile>(KEYS.USERS);
    const cambista = users.find(u => u.uid === cambistaId);
    if (!cambista) throw new Error("Cambista não cadastrado no sistema.");

    const comissionPercentage = cambista.commissionPercentage ?? 5;

    // Resolve all pending bets of this client (phone or userId)
    let relatedBets: Bet[] = [];
    if (bet.customerPhone && bet.customerPhone !== "Não Informado") {
      relatedBets = bets.filter(b => b.customerPhone === bet.customerPhone && b.status === "pendente_recuperacao");
    } else if (bet.userId) {
      relatedBets = bets.filter(b => b.userId === bet.userId && b.status === "pendente_recuperacao");
    } else {
      relatedBets = [bet];
    }

    // Ensure our main bet is included
    if (!relatedBets.some(b => b.id === bet.id)) {
      relatedBets.push(bet);
    }

    let totalStakesInMock = 0;
    let totalComValueInMock = 0;
    const updatedBetIdsMock: string[] = [];
    const mockLogs = getMockData<any>("phbet_mock_recovery_logs") || [];

    for (const b of relatedBets) {
      const comValue = parseFloat(((b.stake * comissionPercentage) / 100).toFixed(2));
      b.status = "recuperada";
      b.cambistaId = cambistaId;
      b.commissionPercentage = comissionPercentage;
      b.commissionValue = comValue;
      b.commissionStatus = "validated";
      b.accepted = true;
      (b as any).cambistaNome = cambista.name;
      (b as any).dataRecuperacao = new Date().toISOString();
      (b as any).recuperadoPor = cambistaId;

      totalStakesInMock += b.stake;
      totalComValueInMock += comValue;
      updatedBetIdsMock.push(b.id);

      mockLogs.push({
        id: `log_${Date.now()}_${b.id}`,
        betId: b.id,
        pin: b.pin || "N/A",
        cambistaId,
        clientId: b.userId || null,
        valorTotal: b.stake,
        comissao: comValue,
        dataRecuperacao: new Date().toISOString(),
        ip: "127.0.0.1"
      });

      if (b.userId) {
        const client = users.find(u => u.uid === b.userId);
        if (client) {
           if (!(client as any).apostasRecuperadas) (client as any).apostasRecuperadas = [];
           if (!(client as any).apostasRecuperadas.includes(b.id)) {
             (client as any).apostasRecuperadas.push(b.id);
           }
           (client as any).ultimaAposta = new Date().toISOString();
        }
      }
    }

    if (!(cambista as any).totalApostasRecuperadas) (cambista as any).totalApostasRecuperadas = 0;
    (cambista as any).totalApostasRecuperadas += relatedBets.length;

    if (!(cambista as any).volumeTotalApostado) (cambista as any).volumeTotalApostado = 0;
    (cambista as any).volumeTotalApostado += totalStakesInMock;

    if (!(cambista as any).apostasRecuperadas) (cambista as any).apostasRecuperadas = [];
    for (const bid of updatedBetIdsMock) {
      if (!(cambista as any).apostasRecuperadas.includes(bid)) {
        (cambista as any).apostasRecuperadas.push(bid);
      }
    }
    (cambista as any).ultimaRecuperacao = new Date().toISOString();

    if (!(cambista as any).saldoComissao) (cambista as any).saldoComissao = 0;
    (cambista as any).saldoComissao += totalComValueInMock;

    if (!(cambista as any).comissaoPendente) (cambista as any).comissaoPendente = 0;
    (cambista as any).comissaoPendente += totalComValueInMock;

    saveMockData(KEYS.BETS, bets);
    saveMockData(KEYS.USERS, users);
    saveMockData("phbet_mock_recovery_logs", mockLogs);

    mockEventBus.notify("bets");
    mockEventBus.notify("users");

    bet.recoveredCount = relatedBets.length;
    bet.recoveredTotalStake = totalStakesInMock;
    return bet;
  }

  const q = query(collection(db, "bets"), where("pin", "==", normalizedPin), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error("Aposta com este PIN não existe.");
  }
  const betDoc = snap.docs[0];
  const betData = betDoc.data() as Bet;
  const betId = betDoc.id;

  if (betData.status !== "pendente_recuperacao") {
    throw new Error(`Aposta já recuperada ou status inválido (Status atual: ${betData.status}).`);
  }

  // Find all other pending bets of this customer to recover all together!
  let customerBets: { docId: string; data: Bet }[] = [];
  if (betData.customerPhone && betData.customerPhone !== "Não Informado") {
    const qCustomer = query(
      collection(db, "bets"),
      where("customerPhone", "==", betData.customerPhone),
      where("status", "==", "pendente_recuperacao")
    );
    const snapCustomer = await getDocs(qCustomer);
    customerBets = snapCustomer.docs.map(d => ({ docId: d.id, data: d.data() as Bet }));
  } else if (betData.userId) {
    const qCustomer = query(
      collection(db, "bets"),
      where("userId", "==", betData.userId),
      where("status", "==", "pendente_recuperacao")
    );
    const snapCustomer = await getDocs(qCustomer);
    customerBets = snapCustomer.docs.map(d => ({ docId: d.id, data: d.data() as Bet }));
  } else {
    customerBets = [{ docId: betId, data: betData }];
  }

  // Deduplicate and ensure our main bet is in the list
  const includedIds = new Set(customerBets.map(b => b.docId));
  if (!includedIds.has(betId)) {
    customerBets.push({ docId: betId, data: betData });
  }

  const cambistaRef = doc(db, "users", cambistaId);
  const clientRef = betData.userId ? doc(db, "users", betData.userId) : null;

  try {
    const updatedBet = await runTransaction(db, async (transaction) => {
      // 1. Get cambista profile first (must do read operations before any write operations!)
      const cambistaSnap = await transaction.get(cambistaRef);
      if (!cambistaSnap.exists()) {
        throw new Error("Cambista não encontrado no banco de dados.");
      }
      const cambistaData = cambistaSnap.data();
      const commissionPercentage = cambistaData.commissionPercentage ?? 5;

      // 2. Read all the bet documents in our list
      const betsToUpdate: { ref: any; currentBet: Bet; betId: string }[] = [];
      for (const item of customerBets) {
        const docRef = doc(db, "bets", item.docId);
        const betSnap = await transaction.get(docRef);
        if (betSnap.exists()) {
          const currentBet = betSnap.data() as Bet;
          if (currentBet.status === "pendente_recuperacao") {
            betsToUpdate.push({ ref: docRef, currentBet, betId: item.docId });
          }
        }
      }

      if (betsToUpdate.length === 0) {
        throw new Error("Nenhuma das apostas deste cliente está pendente de recuperação.");
      }

      // 3. Read client profile document if client exists
      let clientSnap = null;
      if (clientRef) {
        clientSnap = await transaction.get(clientRef);
      }

      // --- ALL READS ARE COMPLETED. NOW DO WRITES ---

      let totalStakesInTransaction = 0;
      let totalCommissionInTransaction = 0;
      const updatedBetIds: string[] = [];

      // 4. Update each bet and write recovery logs
      for (const { ref, currentBet, betId: bId } of betsToUpdate) {
        const commissionValue = parseFloat(((currentBet.stake * commissionPercentage) / 100).toFixed(2));
        transaction.update(ref, {
          status: "recuperada",
          cambistaId: cambistaId,
          cambistaNome: cambistaData.name || "Cambista",
          dataRecuperacao: serverTimestamp(),
          recuperadoPor: cambistaId,
          accepted: true,
          commissionPercentage: commissionPercentage,
          commissionValue: commissionValue,
          commissionStatus: "validated"
        });

        totalStakesInTransaction += currentBet.stake;
        totalCommissionInTransaction += commissionValue;
        updatedBetIds.push(bId);

        const logRef = doc(collection(db, "recovery_logs"));
        transaction.set(logRef, {
          id: logRef.id,
          betId: bId,
          pin: currentBet.pin || "N/A",
          cambistaId: cambistaId,
          clienteId: currentBet.userId || null,
          valorTotal: currentBet.stake,
          comissao: commissionValue,
          dataRecuperacao: serverTimestamp(),
          ip: "127.0.0.1"
        });
      }

      // 5. Update client profile to include these bets
      if (clientRef && clientSnap && clientSnap.exists()) {
        const clientData = clientSnap.data();
        let clientBets = clientData.apostasRecuperadas || [];
        for (const bid of updatedBetIds) {
          if (!clientBets.includes(bid)) {
            clientBets.push(bid);
          }
        }
        transaction.update(clientRef, {
          apostasRecuperadas: clientBets,
          ultimaAposta: serverTimestamp()
        });
      }

      // 6. Update Cambista / Commission metrics
      let cambistaBets = cambistaData.apostasRecuperadas || [];
      for (const bid of updatedBetIds) {
        if (!cambistaBets.includes(bid)) {
          cambistaBets.push(bid);
        }
      }
      const currentTotalRec = cambistaData.totalApostasRecuperadas || 0;
      const currentVolume = cambistaData.volumeTotalApostado || 0;
      const currentSaldo = cambistaData.saldoComissao || 0;
      const currentPendente = cambistaData.comissaoPendente || 0;

      transaction.update(cambistaRef, {
        totalApostasRecuperadas: currentTotalRec + betsToUpdate.length,
        volumeTotalApostado: currentVolume + totalStakesInTransaction,
        apostasRecuperadas: cambistaBets,
        ultimaRecuperacao: serverTimestamp(),
        saldoComissao: currentSaldo + totalCommissionInTransaction,
        comissaoPendente: currentPendente + totalCommissionInTransaction
      });

      // Find original trigger bet's modern representation to return
      const targetBetObj = betsToUpdate.find(x => x.betId === betId) || betsToUpdate[0];

      return {
        ...targetBetObj.currentBet,
        status: "recuperada" as const,
        parentId: cambistaId,
        cambistaId,
        accepted: true,
        commissionPercentage,
        commissionValue: parseFloat(((targetBetObj.currentBet.stake * commissionPercentage) / 100).toFixed(2)),
        commissionStatus: "validated" as const,
        recoveredCount: betsToUpdate.length,
        recoveredTotalStake: totalStakesInTransaction
      };
    });

    return updatedBet as any;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `bets/${betId} (transaction)`);
    throw error;
  }
}
