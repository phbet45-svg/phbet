import React, { useState, useEffect } from "react";
import { Match, League, UserProfile, translatePrediction } from "../types";
import { getActiveCambistas, subscribeToActiveCambistas } from "../lib/dbService";
import { useBetSlip } from "../contexts/BetSlipContext";
import { useAuth } from "../contexts/AuthContext";
import { 
  Calendar, 
  Filter, 
  ShoppingBag, 
  Trash2, 
  Check, 
  Sparkles, 
  Send, 
  UserCheck, 
  AlertCircle,
  Search,
  Trophy,
  Clock,
  ChevronRight,
  TrendingUp,
  Activity
} from "lucide-react";

interface StandingRow {
  pos: number;
  team: { name: string; logo: string };
  points: number;
  played: number;
  wins: number;
  draws: number;
  defeats: number;
  goals_difference: number;
  form: Array<"W" | "D" | "L">;
}

export default function PublicBetting({ isLiveOnly = false }: { isLiveOnly?: boolean }) {
  const { userProfile } = useAuth();
  const { 
    items, 
    stake, 
    totalOdds, 
    potentialPayout, 
    customerName, 
    customerPhone, 
    selectedCambistaId,
    addToSlip, 
    removeFromSlip, 
    clearSlip, 
    setStake, 
    setCustomerName, 
    setCustomerPhone, 
    setSelectedCambistaId,
    submitBet 
  } = useBetSlip();

  const [matches, setMatches] = useState<Match[]>([]);
  const [leaguesList, setLeaguesList] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<"live" | "today" | "tomorrow" | "finished" | "standings">("live");
  const [searchQuery, setSearchQuery] = useState("");
  const [errorBet, setErrorBet] = useState("");
  const [successBet, setSuccessBet] = useState<string | null>(null);
  const [lastPlacedToken, setLastPlacedToken] = useState<string | null>(null);
  const [lastPlacedBet, setLastPlacedBet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  
  // API specific loadings
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingStandings, setLoadingStandings] = useState(false);
  
  // Standings data
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [cambistas, setCambistas] = useState<UserProfile[]>([]);

  // Helpers for date strings query format
  const getTodayDateString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getTomorrowDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Fetch leagues list from backend
  const fetchLeagues = async () => {
    try {
      const res = await fetch("/api/leagues");
      if (res.ok) {
        const data = await res.json();
        setLeaguesList(data);
      }
    } catch (e) {
      console.error("Erro ao obter lista de ligas:", e);
    }
  };

  // Fetch match details dynamically based on chosen subtab
  const fetchMatchesFromApi = async () => {
    setLoadingMatches(true);
    try {
      let endpoint = "/api/live";
      if (selectedDate === "today") endpoint = "/api/fixtures?date=" + getTodayDateString();
      else if (selectedDate === "tomorrow") endpoint = "/api/fixtures?date=" + getTomorrowDateString();
      else if (selectedDate === "finished") endpoint = "/api/results";

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        
        // Map raw API payloads safely to original high-fidelity frontend Match format
        const mapped: Match[] = data.map((m: any) => {
          const oddsObj = m.odds || {};
          return {
            id: m.id || String(Math.floor(Math.random() * 1000000)),
            homeTeam: m.homeTeam || m.home_name || m.home || "Time de Casa",
            awayTeam: m.awayTeam || m.away_name || m.away || "Time de Fora",
            date: m.date || new Date().toISOString().split("T")[0],
            time: m.time || m.scheduled || "16:00",
            league: m.league || m.league_name || "Campeonato Geral",
            isActive: true,
            rawStatus: m.status || m.rawStatus || "",
            status: m.status === "finished" || selectedDate === "finished" ? "finished" : "pending",
            result: m.result || null,
            footballCorners: m.footballCorners || null,
            footballCards: m.footballCards || null,
            // Keep extra attributes from normalization
            logoHome: m.logoHome || "⚽",
            logoAway: m.logoAway || "⚽",
            score: m.score || "",
            minute: m.minute || "",
            odds: {
              homeWins: Number(oddsObj.home || oddsObj.homeWins || 1.85),
              draw: Number(oddsObj.draw || oddsObj.draw || 3.20),
              awayWins: Number(oddsObj.away || oddsObj.awayWins || 2.10),
              over95_corners: Number(oddsObj.over25 || oddsObj.over95_corners || 1.75),
              under95_corners: Number(oddsObj.under25 || oddsObj.under95_corners || 1.95),
              over105_corners: Number(oddsObj.over35 || oddsObj.over105_corners || 2.10),
              under105_corners: Number(oddsObj.under35 || oddsObj.under105_corners || 1.65),
              over115_corners: Number(oddsObj.over05 || oddsObj.over115_corners || 1.15),
              under115_corners: Number(oddsObj.under05 || oddsObj.under115_corners || 4.50),
              over55_cards: Number(oddsObj.btts_yes || oddsObj.over55_cards || 1.80),
              under55_cards: Number(oddsObj.btts_no || oddsObj.under55_cards || 1.90)
            }
          };
        });
        setMatches(mapped);
      }
    } catch (err) {
      console.warn("Failed to retrieve live scores from the API list:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Fetch relational standings
  const fetchStandingsTable = async (leagueId: string) => {
    setLoadingStandings(true);
    try {
      const res = await fetch(`/api/standings?league_id=${leagueId}`);
      if (res.ok) {
        const data = await res.json();
        setStandings(data);
      }
    } catch (e) {
      console.error("Erro ao carregar classificação:", e);
    } finally {
      setLoadingStandings(false);
    }
  };

  // Initialize leagues list and cambistas subscribers
  useEffect(() => {
    fetchLeagues();
    
    const unsubUsers = subscribeToActiveCambistas(async () => {
      try {
        const partners = await getActiveCambistas();
        setCambistas(partners);
      } catch (err) {
        console.error(err);
      }
    });

    return () => {
      unsubUsers();
    };
  }, []);

  // Sync data updates depending on subtab changes
  useEffect(() => {
    if (selectedDate !== "standings") {
      fetchMatchesFromApi();
    } else {
      fetchStandingsTable(selectedLeague === "all" ? "1" : selectedLeague);
    }
  }, [selectedDate, selectedLeague]);

  // Establish automatic real-time score refresh interval (Requirement 1, 15)
  useEffect(() => {
    const timerRefresh = setInterval(() => {
      if (selectedDate !== "standings") {
        fetchMatchesFromApi();
      }
    }, 15000); // refresh matches info every 15 seconds safely

    return () => clearInterval(timerRefresh);
  }, [selectedDate]);

  // Clientside filtering matching searches, countries & leagues
  const getFilteredMatches = () => {
    return matches.filter(match => {
      if (!match) return false;

      // Live game detection: check minute, "AO VIVO" labels, or live status
      const isLive = !!(match.minute || match.time === "AO VIVO" || match.rawStatus === "live");

      // When game starts, it goes to "Ao vivo" tab, and only actually happening games stay in "Ao vivo"
      if (selectedDate === "live" && !isLive) {
        return false;
      }
      if (selectedDate === "today" && isLive) {
        return false;
      }

      // League code filter matching
      if (selectedLeague !== "all" && match.league !== selectedLeague) {
        // Fallback matching against keys
        const matchedLeagueObj = leaguesList.find(l => l.id === selectedLeague);
        if (!matchedLeagueObj || match.league.toLowerCase() !== matchedLeagueObj.name.toLowerCase()) {
          return false;
        }
      }

      // Live search input query matching
      if (searchQuery) {
        const qs = searchQuery.toLowerCase();
        const home = match.homeTeam || "";
        const away = match.awayTeam || "";
        const lg = match.league || "";
        return home.toLowerCase().includes(qs) || 
               away.toLowerCase().includes(qs) || 
               lg.toLowerCase().includes(qs);
      }

      return true;
    });
  };

  async function handleBetSubmission(e: React.FormEvent) {
    e.preventDefault();
    setErrorBet("");
    setSuccessBet(null);
    setLastPlacedToken(null);
    setLoading(true);

    if (items.length === 0) {
      setErrorBet("Adicione pelo menos um palpite ao bilhete.");
      setLoading(false);
      return;
    }

    if (!userProfile) {
      if (!customerName) {
        setErrorBet("Seu nome é necessário para registrar o bilhete de aposta.");
        setLoading(false);
        return;
      }
    } else if (userProfile.role === "cambista") {
      if (!customerName || !customerPhone) {
        setErrorBet("Nome e WhatsApp do cliente apostador são obrigatórios para vendas.");
        setLoading(false);
        return;
      }
    }

    const res = await submitBet();
    if (res.success && res.bet) {
      setSuccessBet(`Aposta registrada com sucesso! Seu PIN é: ${res.bet.pin}. Aguarde o cambista aceitar.`);
      setLastPlacedBet(res.bet);
      if (res.bet.commissionToken) {
        setLastPlacedToken(res.bet.commissionToken);
      }
    } else {
      setErrorBet(res.error || "Algo deu errado ao processar seu bilhete.");
    }
    setLoading(false);
  }

  const filteredMatches = getFilteredMatches();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="sports-lobby-container">
      {/* Title block */}
      <div className="mb-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center justify-center sm:justify-start gap-2.5">
            ⚽ <span className="text-[#007BFF] font-black">PH</span>BET ESPORTES
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl font-medium">
            Lobby integrado com scores em tempo real e cotações dinâmicas de futebol. Siga estatísticas e monte cupons de apostas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-[#007BFF]/5 text-[#007BFF] font-extrabold border border-[#007BFF]/20 rounded-xl px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[#007BFF] animate-pulse" />
          <span>Aposta Segura e Saque Rápido na PH BET</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LOBBY VIEWPORT (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Date Tabs & Filter Controls */}
          <div className="bg-white p-4.5 rounded-2xl shadow-xs border border-gray-200/60 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  id="tab-live-games"
                  onClick={() => {
                    setSelectedDate("live");
                    setSelectedLeague("all");
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedDate === "live"
                      ? "bg-red-600 text-white shadow-md animate-pulse"
                      : "bg-red-50 text-red-650 hover:bg-red-100"
                  }`}
                >
                  <Activity className="h-3.5 w-3.5" />
                  AO VIVO 🔴
                </button>
                <button
                  id="tab-today-games"
                  onClick={() => setSelectedDate("today")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedDate === "today"
                      ? "bg-[#007BFF] text-white shadow"
                      : "bg-gray-50 border border-gray-100 text-gray-650 hover:bg-gray-150"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  Futebol de Hoje
                </button>
                <button
                  id="tab-tomorrow-games"
                  onClick={() => setSelectedDate("tomorrow")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedDate === "tomorrow"
                      ? "bg-[#007BFF] text-white shadow"
                      : "bg-gray-50 border border-gray-100 text-gray-650 hover:bg-gray-150"
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  Jogos de Amanhã
                </button>
                <button
                  id="tab-finished-games"
                  onClick={() => setSelectedDate("finished")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedDate === "finished"
                      ? "bg-[#007BFF] text-white shadow"
                      : "bg-gray-50 border border-gray-100 text-gray-650 hover:bg-gray-150"
                  }`}
                >
                  ✅ Encerrados
                </button>
                <button
                  id="tab-standings"
                  onClick={() => {
                    setSelectedDate("standings");
                    setSelectedLeague("1"); // Default to Brasil Serie A
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedDate === "standings"
                      ? "bg-amber-500 text-slate-950 shadow"
                      : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Classificação / Líderes
                </button>
              </div>
            </div>

            {/* Filter Dropdowns and Search Input */}
            <div className="flex flex-col md:flex-row items-center gap-3 border-t border-gray-100 pt-3.5">
              {/* League Selector */}
              <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                <Filter className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <select
                  id="custom-lobby-league-select"
                  value={selectedLeague}
                  onChange={(e) => setSelectedLeague(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-750 focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF]"
                >
                  <option value="all">🌍 Todos os Campeonatos</option>
                  {leaguesList.map((lg) => (
                    <option key={lg.id} value={lg.id}>
                      {lg.logo} {lg.name} ({lg.country})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Search box */}
              {selectedDate !== "standings" && (
                <div className="relative w-full md:w-64 shrink-0">
                  <input
                    id="match-live-search"
                    type="text"
                    placeholder="Buscar times de hoje..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-550/10 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#007BFF]"
                  />
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* SKELETON LOADERS FOR COMPLIMENTARY SPEED EFFECTS */}
          {loadingMatches && (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div key={n} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                  <div className="grid grid-cols-3 gap-4 h-12 bg-gray-50 rounded-xl"></div>
                </div>
              ))}
            </div>
          )}

          {/* RENDER DYNAMIC CONTENT BASED ON SELECTED TIMINGS */}
          {!loadingMatches && selectedDate === "standings" && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase flex items-center gap-2 text-gray-800">
                  <Trophy className="h-4 w-4 text-amber-500" /> 
                  Tabela Oficial - {leaguesList.find(l => l.id === selectedLeague)?.name || "Série A Geral"}
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider">
                  Temporada Atual 2026/2027
                </span>
              </div>

              {loadingStandings ? (
                <div className="p-12 text-center text-gray-405 font-bold animate-pulse text-xs">
                  Carregando classificação do servidor seguro...
                </div>
              ) : standings.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs font-bold italic">
                  Nenhum dado retornado para esta competição. Selecione outra liga no filtro superior.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead className="bg-[#1F1F1F] text-white uppercase text-[10px] font-black tracking-wider">
                      <tr>
                        <th className="px-4 py-3 text-center w-12">Pos</th>
                        <th className="px-4 py-3">Clube</th>
                        <th className="px-4 py-3 text-center font-black">PTS</th>
                        <th className="px-4 py-3 text-center">J</th>
                        <th className="px-4 py-3 text-center text-emerald-600">V</th>
                        <th className="px-4 py-3 text-center text-amber-600">E</th>
                        <th className="px-4 py-3 text-center text-rose-500">D</th>
                        <th className="px-4 py-3 text-center">SG</th>
                        <th className="px-4 py-3 text-center">Form</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150">
                      {standings.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="px-4 py-3 text-center font-black text-gray-500 text-sm">
                            {row.pos}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900 flex items-center gap-2">
                            <span className="text-sm shrink-0">{row.team.logo}</span>
                            <span>{row.team.name}</span>
                          </td>
                          <td className="px-4 py-3 text-center font-black text-[#007BFF] text-sm">
                            {row.points}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600 font-bold">
                            {row.played}
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-bold">
                            {row.wins}
                          </td>
                          <td className="px-4 py-3 text-center text-amber-600 font-bold">
                            {row.draws}
                          </td>
                          <td className="px-4 py-3 text-center text-rose-500 font-bold">
                            {row.defeats}
                          </td>
                          <td className="px-4 py-3 text-center font-bold font-mono text-gray-700">
                            {row.goals_difference > 0 ? `+${row.goals_difference}` : row.goals_difference}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              {row.form.map((f, fIdx) => (
                                <span 
                                  key={fIdx} 
                                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0 ${
                                    f === "W" ? "bg-emerald-500" : f === "D" ? "bg-amber-550" : "bg-red-500"
                                  }`}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!loadingMatches && selectedDate !== "standings" && (
            <div className="space-y-4">
              {filteredMatches.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-gray-200/80 rounded-2xl p-12 text-center text-gray-400">
                  <p className="font-bold text-sm">Nenhuma partida ao vivo cadastrada ou encontrada na API</p>
                  <p className="text-xs mt-1.5 max-w-sm mx-auto">Tente redefinir seu filtro de campeonato no menu ou busque por um time alternativo acima.</p>
                </div>
              ) : (
                filteredMatches.map((match) => {
                  const isSelected = (prediction: string) => 
                    items.some(i => i.matchId === match.id && i.prediction === prediction);

                  return (
                    <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-sm transition-all overflow-hidden" id={`card-match-${match.id}`}>
                      {/* Header bar */}
                      <div className="bg-gray-50 px-5 py-3 flex justify-between items-center border-b border-gray-100 text-[11px] font-black text-gray-400">
                        <span className="text-blue-700 font-black uppercase tracking-wider">{match.league}</span>
                        <div className="flex items-center gap-2">
                          {match.minute ? (
                            <span className="bg-red-50 dark:bg-red-950/20 text-red-600 px-2 py-0.5 rounded-md flex items-center gap-1 font-black animate-pulse uppercase tracking-wider text-[9px] border border-red-100">
                              🟢 {match.minute}
                            </span>
                          ) : (
                            <span className="text-gray-500 font-bold uppercase tracking-wider bg-gray-100/60 border border-gray-150 px-2 py-0.5 rounded-md text-[9px]">
                              🕒 {match.time}
                            </span>
                          )}
                          <span>📅 {match.date}</span>
                        </div>
                      </div>

                      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        {/* Club Titles & Flags */}
                        <div className="flex-1 flex items-center justify-between gap-4">
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[15px] text-gray-900 font-black tracking-tight">
                              {match.logoHome && (String(match.logoHome).startsWith("http") || String(match.logoHome).startsWith("/")) ? (
                                <img src={match.logoHome} className="w-5 h-5 object-contain shrink-0" alt="Home logo" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-sm inline-block shrink-0">{match.logoHome || "⚽"}</span>
                              )}
                              <span>{match.homeTeam}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[15px] text-gray-900 font-black tracking-tight">
                              {match.logoAway && (String(match.logoAway).startsWith("http") || String(match.logoAway).startsWith("/")) ? (
                                <img src={match.logoAway} className="w-5 h-5 object-contain shrink-0" alt="Away logo" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-sm inline-block shrink-0">{match.logoAway || "⚽"}</span>
                              )}
                              <span>{match.awayTeam}</span>
                            </div>
                          </div>
                          
                          {/* Real-time score board indicator */}
                          {match.score && (
                            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-150 rounded-2xl px-4 py-2 text-center shadow-xs shrink-0 font-sans min-w-[70px]">
                              <span className="text-xl font-black tracking-widest text-[#007BFF] font-mono leading-none">
                                {match.score}
                              </span>
                              <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider mt-1.5 block">PLACAR</span>
                            </div>
                          )}
                        </div>

                        {/* Traditional ODDS layout setup */}
                        <div className="grid grid-cols-3 gap-2 w-full md:w-80 shrink-0">
                          {/* Casa Button */}
                          <button
                            id={`bet-odd-home-${match.id}`}
                            onClick={() => addToSlip(match, "home")}
                            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected("home")
                                ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow font-black"
                                : "bg-blue-50/70 border-blue-100 text-[#007BFF] hover:bg-blue-100 hover:border-blue-200"
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-85 block leading-none">CASA (1)</span>
                            <span className="text-sm font-black mt-1">{(match.odds.homeWins).toFixed(2)}</span>
                          </button>

                          {/* Empate Button */}
                          <button
                            id={`bet-odd-draw-${match.id}`}
                            onClick={() => addToSlip(match, "draw")}
                            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected("draw")
                                ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow font-black"
                                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-85 block leading-none">EMPATE (X)</span>
                            <span className="text-sm font-black mt-1">{(match.odds.draw).toFixed(2)}</span>
                          </button>

                          {/* Fora Button */}
                          <button
                            id={`bet-odd-away-${match.id}`}
                            onClick={() => addToSlip(match, "away")}
                            className={`flex flex-col items-center justify-center py-2.5 rounded-xl border transition-all cursor-pointer ${
                              isSelected("away")
                                ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow font-black"
                                : "bg-blue-50/70 border-blue-100 text-[#007BFF] hover:bg-blue-100 hover:border-blue-200"
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase tracking-wider opacity-85 block leading-none">FORA (2)</span>
                            <span className="text-sm font-black mt-1">{(match.odds.awayWins).toFixed(2)}</span>
                          </button>
                        </div>
                      </div>

                      {/* Collapsible panel with corners and cards */}
                      <div className="bg-gray-50/50 px-5 py-3 border-t border-gray-100 flex flex-col gap-2">
                        <details className="group">
                          <summary className="flex items-center justify-between text-[11px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer select-none">
                            <span className="flex items-center gap-1.5 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/80 transition shadow-2xs font-sans">
                              🎯 Mercados Extras de Escanteios e Cartões (Over/Under)
                            </span>
                            <span className="text-[9px] font-mono opacity-50 group-open:rotate-180 transition-transform">▼</span>
                          </summary>

                          <div className="mt-3.5 pt-3.5 border-t border-gray-100 space-y-4">
                            {/* Corners segment */}
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#007BFF] block mb-2">
                                🚩 ESCANTEIOS (OVER/UNDER)
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                {/* Over/Under 9.5 */}
                                <div className="border border-gray-100 rounded-xl bg-white p-2">
                                  <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 9.5 Escanteios</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "over95_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("over95_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Mais de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.over95_corners ?? 1.75).toFixed(2)}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "under95_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("under95_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Menos de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under95_corners ?? 1.95).toFixed(2)}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Over/Under 10.5 */}
                                <div className="border border-gray-100 rounded-xl bg-white p-2">
                                  <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 10.5 Escanteios</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "over105_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("over105_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Mais de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.over105_corners ?? 2.10).toFixed(2)}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "under105_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("under105_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Menos de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under105_corners ?? 1.65).toFixed(2)}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Over/Under 11.5 */}
                                <div className="border border-gray-100 rounded-xl bg-white p-2">
                                  <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 11.5 Escanteios</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "over115_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("over115_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Mais de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.over115_corners ?? 2.50).toFixed(2)}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "under115_corners")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer ${
                                        isSelected("under115_corners")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="block text-[8px] opacity-75">Menos de</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under115_corners ?? 1.45).toFixed(2)}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cards segment */}
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block mb-2">
                                🎴 CARTÕES (OVER/UNDER)
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {/* Over/Under 5.5 */}
                                <div className="border border-gray-100 rounded-xl bg-white p-2 col-span-2 font-black text-gray-700">
                                  <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 5.5 Cartões Totais</span>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "over55_cards")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer flex flex-col items-center justify-center ${
                                        isSelected("over55_cards")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="text-[8px] opacity-75">Acima de 5.5 (Mais)</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.over55_cards ?? 1.80).toFixed(2)}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => addToSlip(match, "under55_cards")}
                                      className={`py-1 rounded-md text-[10px] font-bold text-center border transition-all cursor-pointer flex flex-col items-center justify-center ${
                                        isSelected("under55_cards")
                                          ? "bg-[#007BFF] text-white border-[#007BFF]"
                                          : "bg-gray-50/60 text-gray-700 hover:bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <span className="text-[8px] opacity-75">Abaixo de 5.5 (Menos)</span>
                                      <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under55_cards ?? 1.90).toFixed(2)}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* BET SLIP COLUMN (1 column) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden sticky top-24" id="betslip-sidebar">
          <div className="bg-[#1F1F1F] px-5 py-4 text-white flex items-center justify-between border-b border-gray-850">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#007BFF]" />
              <span className="text-xs font-black tracking-wider uppercase">Cupom de Aposta</span>
            </div>
            {items.length > 0 && (
              <button 
                id="clear-slip-btn"
                onClick={clearSlip}
                className="text-xs text-rose-300 hover:text-white transition flex items-center gap-1 font-black cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>

          <form onSubmit={handleBetSubmission} className="p-5 space-y-5">
            {/* Coupon state notifications */}
            {errorBet && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-900 flex items-start gap-1.5 rounded-r">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-650" />
                <span>{errorBet}</span>
              </div>
            )}

            {successBet && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-xs text-emerald-950 space-y-2 rounded-r">
                <div className="flex items-start gap-1.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-650 font-bold" />
                  <span className="font-bold text-[13px]">{successBet}</span>
                </div>
                {lastPlacedBet && (
                  <div className="pt-2">
                    <a
                      href={`/?ticket=${lastPlacedBet.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        window.history.pushState({}, "", `/?ticket=${lastPlacedBet.id}`);
                        window.dispatchEvent(new Event("popstate"));
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4.5 py-2.5 rounded-xl uppercase tracking-wider text-[11px] shadow-sm transition-all text-center w-full justify-center cursor-pointer"
                    >
                      <Check className="h-4 w-4" /> Acompanhar Bilhete Online 📋
                    </a>
                    <p className="text-[10px] text-gray-500 font-medium mt-1 text-center">
                      Acompanhe em tempo real ou compartilhe seu palpite.
                    </p>
                  </div>
                )}
                {lastPlacedToken && (
                  <div className="bg-emerald-605 bg-emerald-600 text-white p-2.5 rounded-lg text-center font-mono mt-2">
                    <span className="block text-[8px] uppercase tracking-wider opacity-80">TOKEN DE COMISSÃO DO CAMBISTA</span>
                    <span className="font-bold text-base tracking-widest block mt-0.5">{lastPlacedToken}</span>
                    <span className="block text-[9px] mt-1 font-sans opacity-95">Parabéns! Comissão registrada em nome do cambista intermediador.</span>
                  </div>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-3">
                <ShoppingBag className="h-12 w-12 mx-auto text-gray-200 stroke-[1.5]" />
                <div>
                  <p className="text-xs font-black text-gray-700">O bilhete está vazio</p>
                  <p className="text-[11px] mt-0.5 max-w-[200px] mx-auto text-gray-405">Selecione odds nos jogos ao vivo para apostar.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={`${item.matchId}_${item.prediction}`} className={`pt-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex justify-between items-start gap-2 text-xs">
                      <div className="flex-1 font-bold">
                        <span className="block text-gray-900 leading-snug">{item.homeTeam} x {item.awayTeam}</span>
                        <span className="text-[9px] text-[#007BFF] mt-1 inline-block bg-blue-50 py-0.5 px-2 rounded-md uppercase font-black border border-blue-105">
                          Palpite: {translatePrediction(item.prediction)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-[#007BFF] block">x{item.odd}</span>
                        <button
                          id={`remove-slip-item-${item.matchId}`}
                          type="button"
                          onClick={() => removeFromSlip(item.matchId, item.prediction)}
                          className="text-[10px] text-gray-400 hover:text-red-500 mt-1 transition font-bold cursor-pointer"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* General Fields (Name and commission token selectors) */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 pt-4 space-y-3">
                {/* Apostador fields */}
                {userProfile?.role !== "cliente" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                        Apostador (Nome Completo)
                      </label>
                      <input
                        id="slip-customer-name"
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-950 focus:ring-1 focus:ring-[#007BFF] font-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 tracking-wider">
                        WhatsApp do Apostador
                      </label>
                      <input
                        id="slip-customer-phone"
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ex: 11999998888"
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-950 focus:ring-1 focus:ring-[#007BFF] font-black"
                      />
                    </div>
                  </>
                )}

                {/* Cambista selector */}
                {userProfile?.role !== "cambista" && (
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-[#007BFF]" />
                      Intermediado por Cambista?
                    </label>
                    <select
                      id="slip-select-cambista"
                      value={selectedCambistaId}
                      onChange={(e) => setSelectedCambistaId(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 font-bold focus:ring-1 focus:ring-[#007BFF]"
                    >
                      <option value="">Nenhum Cambista (Aposta Direta)</option>
                      {cambistas.map((pt) => (
                        <option key={pt.uid} value={pt.uid}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                    {selectedCambistaId && (
                      <span className="block text-[9px] text-[#007BFF] font-black mt-1.5 bg-blue-50/50 border border-blue-100 px-2 py-1 rounded">
                        ✨ Token de comissão será gerado para o cambista.
                      </span>
                    )}
                  </div>
                )}

                {/* Stake / values fields */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Valor da Aposta
                    </label>
                    <div className="relative mt-1">
                      <span className="absolute left-2 top-1.5 text-xs font-bold text-gray-405">R$</span>
                      <input
                        id="slip-stake-input"
                        type="number"
                        min="5"
                        value={stake}
                        onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                        className={`w-full bg-white border rounded-lg pl-7 pr-2 py-1 text-xs text-gray-950 font-black focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF] ${
                          stake < 5 ? "border-rose-400 ring-1 ring-rose-200" : "border-gray-200"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Cotização total</span>
                    <span className="block text-sm font-black text-[#007BFF] mt-1.5 font-mono">
                      {items.length > 0 ? `x${totalOdds}` : "x0.00"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 py-1 font-extrabold pb-2 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Retorno Potencial:</span>
                    <span className="text-base text-emerald-600 font-black font-mono">
                      R$ {potentialPayout.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {totalOdds * stake > 10050 && (
                    <span className="block text-[9px] text-amber-600 text-right font-black">
                      ⚠️ Teto de R$ 10.000,00 aplicado
                    </span>
                  )}
                </div>

                <button
                  id="submit-bet-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#007BFF] hover:bg-[#007BFF]/95 text-white font-black text-xs py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer disabled:bg-gray-400"
                >
                  <Send className="h-4 w-4" />
                  {loading ? "Processando..." : "Registrar Bilhete"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
