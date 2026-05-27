export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "cambista" | "cliente";
  status: "active" | "blocked";
  commissionPercentage: number; // e.g., 15 for 15%
  bankLimit?: number; // credit or bank limit for cambistas
  createdAt: string;
  password?: string;
}

export interface MatchOdds {
  homeWins: number;
  draw: number;
  awayWins: number;
  over95_corners?: number;
  under95_corners?: number;
  over105_corners?: number;
  under105_corners?: number;
  over115_corners?: number;
  under115_corners?: number;
  over55_cards?: number;
  under55_cards?: number;
}

export interface SelectedBetMatch {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string; // was limited to 1X2, now extensible supporting corners & cards
  odd: number;
  status: "pending" | "won" | "lost";
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // e.g. "2026-05-26"
  time?: string; // e.g. "18:00"
  league: string; // league name, e.g., "Serie A"
  isActive: boolean;
  odds: MatchOdds;
  rawOdds?: MatchOdds; // Original API odds before margin was applied
  houseMarginOverride?: number; // Override margin for this specific game
  status: "pending" | "finished" | "cancelled";
  result: "home" | "draw" | "away" | null;
  footballCorners?: number | null; // Ended match total corners (e.g. 11)
  footballCards?: number | null; // Ended match total cards (e.g. 6)
  imageUrl?: string; // Optional custom match flyer or image URL
  createdAt: string;
}

export interface Bet {
  id: string;
  userId: string | null; // null if guest registered by cambista
  customerName: string; // customer's name
  customerPhone: string; // customer's WhatsApp
  matches: SelectedBetMatch[];
  totalOdd: number;
  stake: number; // in R$
  potentialPayout: number; // totalOdd * stake
  status: "pending" | "won" | "lost" | "cancelled" | "pendente_recuperacao" | "recuperada";
  cambistaId: string | null; // UID of cambista if registered via cambista
  commissionPercentage: number | null; // cambista commission rate at placement
  commissionValue: number | null; // calculated commission: stake * commissionPercentage / 100
  commissionToken: string | null; // unique token of commission transaction
  commissionStatus: "pending" | "validated" | "cancelled";
  createdAt: string;
  pin: string; // Add pin field
  accepted: boolean; // Add accepted field
  recoveredCount?: number; // Optional count of bets recovered together
  recoveredTotalStake?: number; // Optional sum of stakes recovered together
}

export interface League {
  id: string;
  name: string;
  isActive: boolean;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  importedCount: number;
  details: string;
}

export interface SystemConfig {
  houseMargin: number; // e.g. 10 for 10%
  apiUrl: string;
  apiKey: string;
  socialInstagram?: string;
  socialTelegram?: string;
  socialTwitter?: string;
  supportWhatsapp?: string;
  apiKeyTheOdds?: string;
  apiFootballKey?: string;
  leagueMargins?: Record<string, number>; // Custom margin per league/competition
}

export function translatePrediction(prediction: string): string {
  switch (prediction) {
    case "home": return "Vencedor: Casa";
    case "draw": return "Vencedor: Empate";
    case "away": return "Vencedor: Fora";
    case "over95_corners": return "Escanteios: Casa (Acima de 9.5)";
    case "under95_corners": return "Escanteios: Fora (Abaixo de 9.5)";
    case "over105_corners": return "Escanteios: Casa (Acima de 10.5)";
    case "under105_corners": return "Escanteios: Fora (Abaixo de 10.5)";
    case "over115_corners": return "Escanteios: Casa (Acima de 11.5)";
    case "under115_corners": return "Escanteios: Fora (Abaixo de 11.5)";
    case "over55_cards": return "Cartões: Casa (Acima de 5.5)";
    case "under55_cards": return "Cartões: Fora (Abaixo de 5.5)";
    default: return prediction;
  }
}

