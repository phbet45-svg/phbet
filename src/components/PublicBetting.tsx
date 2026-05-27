import React, { useState, useEffect } from "react";
import { Match, League, UserProfile, translatePrediction } from "../types";
import { getMatches, getLeagues, getActiveCambistas, subscribeToCollection, subscribeToActiveCambistas } from "../lib/dbService";
import { useBetSlip } from "../contexts/BetSlipContext";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, Filter, ShoppingBag, Trash2, Check, Sparkles, Send, MapPin, UserCheck, AlertCircle } from "lucide-react";

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
  const [leagues, setLeagues] = useState<League[]>([]);
  const [cambistas, setCambistas] = useState<UserProfile[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<"today" | "tomorrow" | "all">("all");
  const [errorBet, setErrorBet] = useState("");
  const [successBet, setSuccessBet] = useState<string | null>(null);
  const [lastPlacedToken, setLastPlacedToken] = useState<string | null>(null);
  const [lastPlacedBet, setLastPlacedBet] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "showcase">("showcase");

  // Load matches, leagues & partners
  async function loadData() {
    try {
      const allMatches = await getMatches();
      // Only active matches
      setMatches(allMatches.filter(m => m.isActive));
      
      const allLeagues = await getLeagues();
      const uniqueLeaguesMap = new Map<string, League>();
      allLeagues.filter(l => l.isActive).forEach(l => {
        if (!uniqueLeaguesMap.has(l.name)) {
          uniqueLeaguesMap.set(l.name, l);
        }
      });
      setLeagues(Array.from(uniqueLeaguesMap.values()));

      const activeCambistas = await getActiveCambistas();
      setCambistas(activeCambistas);
    } catch (err) {
      console.error("Failed to load sports data", err);
    }
  }

  useEffect(() => {
    loadData();
    // Subscribe to real-time changes
    const unsubMatches = subscribeToCollection("matches", loadData);
    const unsubLeagues = subscribeToCollection("leagues", loadData);
    const unsubUsers = subscribeToActiveCambistas(loadData);

    return () => {
      unsubMatches();
      unsubLeagues();
      unsubUsers();
    };
  }, []);

  // Filter matches
  const filteredMatches = matches.filter(m => {
    // Live Filter
    if (isLiveOnly) {
        const [hour, minute] = (m.time || "18:00").split(":").map(Number);
        const gameTime = new Date(m.date);
        gameTime.setHours(hour, minute);
        const now = new Date();
        const twoHoursLater = new Date(gameTime.getTime() + 2 * 60 * 60 * 1000);
        return now >= gameTime && now <= twoHoursLater;
    }
    
    // League Filter
    if (selectedLeague !== "all" && m.league !== selectedLeague) {
      return false;
    }

    // Date Filter
    const matchDateStr = m.date; // "yyyy-mm-dd"
    const todayStr = new Date().toISOString().split("T")[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (selectedDate === "today" && matchDateStr !== todayStr) {
      return false;
    }
    if (selectedDate === "tomorrow" && matchDateStr !== tomorrowStr) {
      return false;
    }

    return true;
  });

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

    // If Cambista is logged or placing, name and phone should be provided
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title block */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          ⚽ Lobby Esportivo PH <span className="text-[#00AEEF] font-black">BET</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1.5 max-w-2xl">
          Estatísticas ao vivo e odds premium garantidas. Selecione seus confrontos, defina seus palpites e monte seu bilhete profissional abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LOBBY / CONECTIONS (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Dates & League Filters Header */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Today or Tomorrow filter */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                id="filter-date-all"
                onClick={() => setSelectedDate("all")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedDate === "all"
                    ? "bg-[#007BFF] text-white shadow-sm"
                    : "bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-150"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Todos os Jogos
              </button>
              <button
                id="filter-date-today"
                onClick={() => setSelectedDate("today")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedDate === "today"
                    ? "bg-[#007BFF] text-white shadow-sm"
                    : "bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-150"
                }`}
              >
                Hoje
              </button>
              <button
                id="filter-date-tomorrow"
                onClick={() => setSelectedDate("tomorrow")}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedDate === "tomorrow"
                    ? "bg-[#007BFF] text-white shadow-sm"
                    : "bg-gray-50 border border-gray-100 text-gray-600 hover:bg-gray-150"
                }`}
              >
                Amanhã
              </button>
            </div>

            {/* League Dropdown filter */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Filter className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                id="filter-league-select"
                value={selectedLeague}
                onChange={(e) => setSelectedLeague(e.target.value)}
                className="w-full md:w-56 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF]"
              >
                <option value="all">Todas as Ligas</option>
                {leagues.map((lg) => (
                  <option key={lg.id} value={lg.name}>
                    {lg.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Confrontos/Odds Grid */}
          <div className="space-y-4">
            {filteredMatches.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400">
                <p className="font-bold text-sm">Nenhuma partida disponível</p>
                <p className="text-xs mt-1">Modifique os filtros acima ou aguarde a atualização manual dos jogos pelo administrador no simulador.</p>
              </div>
            ) : (
              filteredMatches.map((match) => {
                // Check if a specific prediction is selected in the betslip
                const isSelected = (prediction: string) => 
                  items.some(i => i.matchId === match.id && i.prediction === prediction);

                return (
                  <div key={match.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden">
                    {/* Header info */}
                    <div className="bg-gray-50/50 px-5 py-2.5 flex justify-between items-center border-b border-gray-100 text-[11px] font-semibold text-gray-400">
                      <span className="text-blue-700 font-bold uppercase tracking-wider">{match.league}</span>
                      <span>📅 {match.date}</span>
                    </div>

                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Teams labels */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900 font-black">
                          <span className="text-center bg-gray-100 text-gray-600 h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-mono">C</span>
                          <span>{match.homeTeam}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-900 font-black mt-2">
                          <span className="text-center bg-gray-100 text-gray-600 h-5 w-5 rounded-full text-[10px] flex items-center justify-center font-mono">F</span>
                          <span>{match.awayTeam}</span>
                        </div>
                      </div>

                      {/* ODodds buttons layout */}
                      <div className="grid grid-cols-3 gap-2.5 w-full md:w-80 shrink-0">
                        {/* Casa */}
                        <button
                          id={`bet-odd-home-${match.id}`}
                          onClick={() => addToSlip(match, "home")}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            isSelected("home")
                              ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow"
                              : "bg-blue-50/70 border-blue-100 text-[#007BFF] hover:bg-blue-100 hover:border-blue-200 cursor-pointer"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Casa</span>
                          <span className="text-sm font-black mt-0.5">{match.odds.homeWins.toFixed(2)}</span>
                        </button>

                        {/* Empate */}
                        <button
                          id={`bet-odd-draw-${match.id}`}
                          onClick={() => addToSlip(match, "draw")}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            isSelected("draw")
                              ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Empate</span>
                          <span className="text-sm font-black mt-0.5">{match.odds.draw.toFixed(2)}</span>
                        </button>

                        {/* Fora */}
                        <button
                          id={`bet-odd-away-${match.id}`}
                          onClick={() => addToSlip(match, "away")}
                          className={`flex flex-col items-center justify-center py-2 rounded-xl border transition-all ${
                            isSelected("away")
                              ? "bg-[#007BFF] border-[#007BFF] text-white scale-[1.03] shadow"
                              : "bg-blue-50/70 border-blue-100 text-[#007BFF] hover:bg-blue-100 hover:border-blue-200 cursor-pointer"
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-85">Fora</span>
                          <span className="text-sm font-black mt-0.5">{match.odds.awayWins.toFixed(2)}</span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsible panel with corners and cards */}
                    <div className="bg-gray-50/40 px-5 py-3 border-t border-gray-100 flex flex-col gap-2">
                      <details className="group">
                        <summary className="flex items-center justify-between text-[11px] font-bold text-gray-500 hover:text-gray-800 cursor-pointer select-none">
                          <span className="flex items-center gap-1.5 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/80 transition shadow-2xs font-sans">
                            🎯 Mercados de Escanteios e Cartões (Over/Under)
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
                                <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 9.5</span>
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
                                    <span className="block text-[8px] opacity-75">Casa</span>
                                    <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.over95_corners ?? 1.85).toFixed(2)}</span>
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
                                    <span className="block text-[8px] opacity-75">Fora</span>
                                    <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under95_corners ?? 1.85).toFixed(2)}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Over/Under 10.5 */}
                              <div className="border border-gray-100 rounded-xl bg-white p-2">
                                <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 10.5</span>
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
                                    <span className="block text-[8px] opacity-75">Casa</span>
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
                                    <span className="block text-[8px] opacity-75">Fora</span>
                                    <span className="font-extrabold text-[11px] mt-0.5 block">{(match.odds.under105_corners ?? 1.65).toFixed(2)}</span>
                                  </button>
                                </div>
                              </div>

                              {/* Over/Under 11.5 */}
                              <div className="border border-gray-100 rounded-xl bg-white p-2">
                                <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha 11.5</span>
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
                                    <span className="block text-[8px] opacity-75">Casa</span>
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
                                    <span className="block text-[8px] opacity-75">Fora</span>
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
                              <div className="border border-gray-100 rounded-xl bg-white p-2 col-span-2">
                                <span className="block text-[9px] font-bold text-gray-400 text-center mb-1.5 leading-none">Linha Geral : 5.5 Cartões</span>
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
                                    <span className="text-[8px] opacity-75">Casa (Acima de 5.5)</span>
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
                                    <span className="text-[8px] opacity-75">Fora (Abaixo de 5.5)</span>
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
        </div>

        {/* BET SLIP COLUMN (1 column) */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden sticky top-24">
          <div className="bg-[#1F1F1F] px-5 py-4 text-white flex items-center justify-between border-b border-gray-850">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-[#00AEEF]" />
              <span className="text-xs font-black tracking-wider uppercase">Cupom de Aposta</span>
            </div>
            {items.length > 0 && (
              <button 
                id="clear-slip-btn"
                onClick={clearSlip}
                className="text-xs text-rose-300 hover:text-white transition flex items-center gap-1 font-black"
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
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorBet}</span>
              </div>
            )}

            {successBet && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded text-xs text-emerald-950 space-y-2 rounded-r">
                <div className="flex items-start gap-1.5">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 font-bold" />
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
                  <div className="bg-emerald-600 text-white p-2.5 rounded-lg text-center font-mono mt-2">
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
                  <p className="text-[11px] mt-0.5 max-w-[200px] mx-auto text-gray-400">Clique nas odds desejadas ao lado para adicionar seleções.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 divide-y divide-gray-100 max-h-60 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={item.matchId} className={`pt-3 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex justify-between items-start gap-2 text-xs">
                      <div className="flex-1 font-bold">
                        <span className="block text-gray-900 leading-snug">{item.homeTeam} x {item.awayTeam}</span>
                        <span className="text-[9px] text-[#007BFF] mt-1 inline-block bg-blue-50 py-0.5 px-2 rounded-md uppercase font-black border border-blue-100/40">
                          Palpite: {translatePrediction(item.prediction)}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-[#007BFF] block">x{item.odd}</span>
                        <button
                          id={`remove-slip-item-${item.matchId}`}
                          type="button"
                          onClick={() => removeFromSlip(item.matchId, item.prediction)}
                          className="text-[10px] text-gray-400 hover:text-red-500 mt-1 transition font-bold"
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
                {/* 1. Cliente fields if NOT a Cliente account */}
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-950 focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF] font-black"
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-950 focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF] font-black"
                      />
                    </div>
                  </>
                )}

                {/* 3. Cambista Selector for earning Commission */}
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
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 font-bold focus:ring-1 focus:ring-[#007BFF] focus:border-[#007BFF]"
                    >
                      <option value="">Nenhum Cambista (Aposta Direta)</option>
                      {cambistas.map((pt) => (
                        <option key={pt.uid} value={pt.uid}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                    {selectedCambistaId && (
                      <span className="block text-[9px] text-[#00AEEF] font-black mt-1.5 bg-blue-50/50 border border-blue-105/50 px-2 py-1 rounded">
                        ✨ Token de comissão será gerado para o agente selecionado.
                      </span>
                    )}
                  </div>
                )}

                {/* Stake amount / potential payout calculation */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-201/60">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                      Valor da Aposta
                    </label>
                    <div className="relative mt-1 font-sans">
                      <span className="absolute left-2 top-1.5 text-xs font-bold text-gray-400">R$</span>
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
                    {stake < 5 && (
                      <span className="block text-[9px] text-rose-500 font-bold mt-1 leading-tight">
                        Aposta mínima é R$ 5,00
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">Cotização Total</span>
                    <span className="block text-sm font-black text-[#007BFF] mt-1.5 font-mono">
                      {items.length > 0 ? `x${totalOdds}` : "x0.00"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 py-1 font-extrabold pb-2 border-b border-gray-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 font-sans">Retorno Potencial:</span>
                    <span className="text-base text-emerald-600 font-black font-mono">
                      R$ {potentialPayout.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {totalOdds * stake > 10050 && (
                    <span className="block text-[9px] text-amber-600 text-right font-bold font-sans">
                      ⚠️ Payout máximo atingido (Teto R$ 10.000,00)
                    </span>
                  )}
                </div>

                <button
                  id="submit-bet-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#007BFF] hover:bg-[#007BFF]/95 text-white font-black text-sm py-3 rounded-xl transition-all shadow-md shadow-blue-200/50 flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer disabled:bg-gray-400"
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
