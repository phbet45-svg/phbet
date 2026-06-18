import React, { useState, useEffect } from "react";
import { UserProfile, Match, Bet, League, SyncLog, SystemConfig } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { auth, createAuthUserWithoutSignout } from "../lib/firebase";
import { 
  getUsers, 
  getMatches, 
  getBets, 
  getLeagues, 
  getSyncLogs, 
  getSystemConfig, 
  updateUserProfile, 
  deleteUserProfile,
  calculateOddsWithMargin,
  saveMatch, 
  updateMatchStatus, 
  saveLeague, 
  saveSystemConfig, 
  triggerSportsApiSync, 
  createUserProfile,
  subscribeToCollection,
  adminResetEverything,
  updateBet
} from "../lib/dbService";
import { 
  TrendingUp, Users, Award, Shield, Settings, Server, RefreshCw, PlusCircle, 
  Activity, Ban, CircleCheck, Check, DollarSign, Search, Calendar, Landmark, AlertCircle
} from "lucide-react";
import AdminGameUpload from "./AdminGameUpload";

export default function AdminPanel() {
  const { userProfile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"metrics" | "cambistas" | "fixtures" | "odds" | "finance" | "config">("metrics");
  
  // States of DB
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ houseMargin: 10, apiUrl: "", apiKey: "" });

  // Cambista Register Fields
  const [newCambistaName, setNewCambistaName] = useState("");
  const [newCambistaEmail, setNewCambistaEmail] = useState("");
  const [newCambistaPhone, setNewCambistaPhone] = useState("");
  const [newCambistaCommission, setNewCambistaCommission] = useState(15);
  const [newCambistaPass, setNewCambistaPass] = useState("");
  const [newCambistaBankLimit, setNewCambistaBankLimit] = useState(1000);
  const [matchCornersResult, setMatchCornersResult] = useState<Record<string, number>>({});
  const [matchCardsResult, setMatchCardsResult] = useState<Record<string, number>>({});
  const [cambistaSearch, setCambistaSearch] = useState("");
  const [cambistaRegisterMsg, setCambistaRegisterMsg] = useState({ type: "", text: "" });

  // Cambista EDIT Fields
  const [editingCambista, setEditingCambista] = useState<UserProfile | null>(null);
  const [cambistaToDelete, setCambistaToDelete] = useState<UserProfile | null>(null);
  const [editCambistaName, setEditCambistaName] = useState("");
  const [editCambistaEmail, setEditCambistaEmail] = useState("");
  const [editCambistaPhone, setEditCambistaPhone] = useState("");
  const [editCambistaCommission, setEditCambistaCommission] = useState(15);
  const [editCambistaPass, setEditCambistaPass] = useState("");
  const [editCambistaBankLimit, setEditCambistaBankLimit] = useState(1000);

  // Custom Match Register Fields
  const [newHomeTeam, setNewHomeTeam] = useState("");
  const [newAwayTeam, setNewAwayTeam] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newHomeOdd, setNewHomeOdd] = useState(2.0);
  const [newDrawOdd, setNewDrawOdd] = useState(3.0);
  const [newAwayOdd, setNewAwayOdd] = useState(3.0);
  const [matchRegisterMsg, setMatchRegisterMsg] = useState({ type: "", text: "" });

  // Odds editing state
  const [editingMatchOddsId, setEditingMatchOddsId] = useState<string | null>(null);
  const [overrideHomeOdd, setOverrideHomeOdd] = useState(2.0);
  const [overrideDrawOdd, setOverrideDrawOdd] = useState(3.0);
  const [overrideAwayOdd, setOverrideAwayOdd] = useState(3.0);
  const [overrideMatchMargin, setOverrideMatchMargin] = useState<number>(10);

  // Bet Builder
  const [betBuilderDiscount, setBetBuilderDiscount] = useState(20);

  // Margino configuration fields
  const [houseMarginInput, setHouseMarginInput] = useState(10);
  const [leagueMargins, setLeagueMargins] = useState<Record<string, number>>({});
  const [sportsApiUrl, setSportsApiUrl] = useState("");
  const [sportsApiKey, setSportsApiKey] = useState("");
  const [configMsg, setConfigMsg] = useState({ type: "", text: "" });

  // New configurations (Site settings, social, keys)
  const [socialInstagram, setSocialInstagram] = useState("");
  const [socialTelegram, setSocialTelegram] = useState("");
  const [socialTwitter, setSocialTwitter] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");
  const [apiKeyTheOdds, setApiKeyTheOdds] = useState("");
  const [apiFootballKey, setApiFootballKey] = useState("");
  const [footballDataToken, setFootballDataToken] = useState("");

  // Financial Filters
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [selectedCambistaFilter, setSelectedCambistaFilter] = useState("all");

  // Syncing loaders
  const [isSyncing, setIsSyncing] = useState(false);

  // Load backend collections on startup
  async function refreshAllData() {
    if (!userProfile) return;
    try {
      const allUsers = await getUsers();
      setUsers(allUsers);

      const allMatches = await getMatches();
      setMatches(allMatches);

      const allBets = await getBets();
      setBets(allBets);

      const allLeagues = await getLeagues();
      const uniqueLeaguesMap = new Map<string, League>();
      allLeagues.forEach(l => {
        const nameKey = l.name.toLowerCase().trim();
        if (!uniqueLeaguesMap.has(nameKey)) {
          uniqueLeaguesMap.set(nameKey, l);
        }
      });
      setLeagues(Array.from(uniqueLeaguesMap.values()));

      const allLogs = await getSyncLogs();
      setSyncLogs(allLogs);

      const config = await getSystemConfig();
      setSystemConfig(config);
      setHouseMarginInput(config.houseMargin);
      setSportsApiUrl(config.apiUrl);
      setSportsApiKey(config.apiKey);
      setSocialInstagram(config.socialInstagram || "");
      setSocialTelegram(config.socialTelegram || "");
      setSocialTwitter(config.socialTwitter || "");
      setSupportWhatsapp(config.supportWhatsapp || "");
      setApiKeyTheOdds(config.apiKeyTheOdds || "");
      setApiFootballKey(config.apiFootballKey || "");
      setFootballDataToken(config.footballDataToken || "");
      setLeagueMargins(config.leagueMargins || {});
      setBetBuilderDiscount(config.betBuilderDiscount || 20);
    } catch (err) {
      console.error("Failed to refresh admin panel collections", err);
    }
  }

  useEffect(() => {
    if (userProfile) {
      refreshAllData();
    }
    // Setup real-time listeners - this should probably also wait for profile
    // But since it calls refreshAllData, let's keep it here, but maybe guarded with userProfile
    if (userProfile) {
      const unsubUsers = subscribeToCollection("users", refreshAllData);
      const unsubMatches = subscribeToCollection("matches", refreshAllData);
      const unsubBets = subscribeToCollection("bets", refreshAllData);
      const unsubLeagues = subscribeToCollection("leagues", refreshAllData);
      const unsubLogs = subscribeToCollection("sync_logs", refreshAllData);

      return () => {
        unsubUsers();
        unsubMatches();
        unsubBets();
        unsubLeagues();
        unsubLogs();
      };
    }
  }, [userProfile]);

  // ==========================================
  // METRICS COMPUTATIONS
  // ==========================================
  const totalStakes = bets.reduce((acc, b) => acc + b.stake, 0);
  const totalPayouts = bets.filter(b => b.status === "won").reduce((acc, b) => acc + b.potentialPayout, 0);
  const totalPaidCommissions = bets.filter(b => b.commissionStatus === "validated").reduce((acc, b) => acc + (b.commissionValue || 0), 0);
  const bancaProfit = parseFloat((totalStakes - totalPayouts - totalPaidCommissions).toFixed(2));

  // Date bounded metrics (Today, 7 Days, 30 Days)
  function getFilteredFaturamento(days: number): number {
    const cutOff = Date.now() - days * 24 * 60 * 60 * 1000;
    return bets
      .filter(b => new Date(b.createdAt).getTime() >= cutOff)
      .reduce((acc, b) => acc + b.stake, 0);
  }

  const faturamentoHoje = bets
    .filter(b => {
      const today = new Date().toISOString().split("T")[0];
      return b.createdAt.startsWith(today);
    })
    .reduce((acc, b) => acc + b.stake, 0);

  const faturamento7d = getFilteredFaturamento(7);
  const faturamento30d = getFilteredFaturamento(30);

  // Users counts
  const countCambistas = users.filter(u => u.role === "cambista").length;
  const countClientes = users.filter(u => u.role === "cliente").length;

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  // 1. Cambistas actions
  async function handleRegisterCambista(e: React.FormEvent) {
    e.preventDefault();
    setCambistaRegisterMsg({ type: "", text: "" });

    if (!newCambistaName || !newCambistaEmail || !newCambistaPhone || !newCambistaPass) {
      setCambistaRegisterMsg({ type: "error", text: "Preencha todos os campos do parceiro." });
      return;
    }

    try {
      const uid = await createAuthUserWithoutSignout(newCambistaEmail, newCambistaPass);
      const initialProfile: UserProfile = {
        uid,
        name: newCambistaName,
        email: newCambistaEmail,
        phone: newCambistaPhone,
        role: "cambista",
        status: "active",
        commissionPercentage: newCambistaCommission,
        bankLimit: newCambistaBankLimit,
        createdAt: new Date().toISOString(),
        password: newCambistaPass
      };
      console.log("[PH_BET] AdminPanel - Creating profile:", initialProfile);
      await createUserProfile(initialProfile);

      setCambistaRegisterMsg({ type: "success", text: `Cambista ${newCambistaName} registrado com sucesso!` });
      setNewCambistaName("");
      setNewCambistaEmail("");
      setNewCambistaPhone("");
      setNewCambistaPass("");
      setNewCambistaCommission(15);
      setNewCambistaBankLimit(1000);
      refreshAllData();
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        console.warn("[PH_BET] AdminPanel - Auth user exists. Attempting to update Firestore profile.");
        // Try to find if Firestore profile exists but has wrong UID or needs update
        const { findProfileByIdentifier } = await import("../lib/dbService");
        const existing = await findProfileByIdentifier(newCambistaEmail);
        
        const profileData = {
          name: newCambistaName,
          email: newCambistaEmail,
          phone: newCambistaPhone,
          role: "cambista" as const,
          status: "active" as const,
          commissionPercentage: newCambistaCommission,
          bankLimit: newCambistaBankLimit,
          password: newCambistaPass
        };

        if (existing) {
          await updateUserProfile(existing.uid, profileData);
          setCambistaRegisterMsg({ type: "success", text: `Perfil do Cambista ${newCambistaName} atualizado (já existia)!` });
        } else {
          // Create with a generated ID if we can't get the Auth UID easily (AuthContext login will fix UID later if needed)
          const tempUid = `ext_${Date.now()}`;
          await createUserProfile({ ...profileData, uid: tempUid, createdAt: new Date().toISOString() });
          setCambistaRegisterMsg({ type: "success", text: `Cambista ${newCambistaName} registrado (Auth já existia).` });
        }
        
        setNewCambistaName("");
        setNewCambistaEmail("");
        setNewCambistaPhone("");
        setNewCambistaPass("");
        refreshAllData();
      } else {
        console.error("[PH_BET] AdminPanel - Error registering cambista:", e);
        setCambistaRegisterMsg({ type: "error", text: "Erro: " + (e.message || "Ocorreu um erro no registro.") });
      }
    }
  }

  async function toggleBlockCambista(uid: string, currentStatus: "active" | "blocked") {
    const desiredStatus = currentStatus === "active" ? "blocked" : "active";
    await updateUserProfile(uid, { status: desiredStatus });
    refreshAllData();
  }

  async function updateCambistaPercentage(uid: string, percent: number) {
    await updateUserProfile(uid, { commissionPercentage: percent });
    refreshAllData();
  }

  function handleRemoveCambista(c: UserProfile) {
    setCambistaToDelete(c);
  }

  async function executeRemoveCambista() {
    if (!cambistaToDelete) return;
    try {
      await deleteUserProfile(cambistaToDelete.uid);
      setCambistaToDelete(null);
      alert("Cambista excluído com sucesso!");
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao excluir cambista: " + (err.message || err));
    }
  }

  function handleOpenEditCambista(c: UserProfile) {
    setEditingCambista(c);
    setEditCambistaName(c.name);
    setEditCambistaEmail(c.email);
    setEditCambistaPhone(c.phone || "");
    setEditCambistaCommission(c.commissionPercentage || 15);
    setEditCambistaPass(c.password || "");
    setEditCambistaBankLimit(c.bankLimit ?? 1000);
  }

  async function handleSaveEditCambista(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCambista) return;
    try {
      const uData: Partial<UserProfile> = {
        name: editCambistaName,
        email: editCambistaEmail,
        phone: editCambistaPhone,
        commissionPercentage: editCambistaCommission,
        bankLimit: editCambistaBankLimit
      };
      if (editCambistaPass) {
        uData.password = editCambistaPass;
      }
      await updateUserProfile(editingCambista.uid, uData);
      setEditingCambista(null);
      alert("Configurações do cambista do PH BET salvas com sucesso!");
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao editar cambista: " + err.message);
    }
  }

  // Action to cancel a bet
  async function handleCancelBet(bet: Bet) {
    if (!confirm("Tem certeza que deseja cancelar esta aposta?")) return;
    try {
      const cancelledBet: Bet = { ...bet, status: "cancelled", commissionStatus: "cancelled" };
      await updateBet(cancelledBet);
      alert("Bilhete cancelado com sucesso!");
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao cancelar o bilhete: " + err.message);
    }
  }

  // 2. Custom Match / League Actions
  async function handleRegisterMatch(e: React.FormEvent) {
    e.preventDefault();
    setMatchRegisterMsg({ type: "", text: "" });

    if (!newHomeTeam || !newAwayTeam || !newLeagueName) {
      setMatchRegisterMsg({ type: "error", text: "Preencha os nomes das equipes e selecione a liga." });
      return;
    }

    try {
      const matchId = `match_${Date.now()}`;
      const newMatch: Match = {
        id: matchId,
        homeTeam: newHomeTeam,
        awayTeam: newAwayTeam,
        date: new Date().toISOString().split("T")[0],
        league: newLeagueName,
        isActive: true,
        odds: {
          homeWins: newHomeOdd,
          draw: newDrawOdd,
          awayWins: newAwayOdd
        },
        status: "pending",
        result: null,
        createdAt: new Date().toISOString()
      };

      await saveMatch(newMatch);

      // Save league to selection list if it doesn't already exist
      const lExists = leagues.some(l => l.name.toLowerCase() === newLeagueName.toLowerCase());
      if (!lExists) {
        const leagueId = `league_${Date.now()}`;
        await saveLeague({ id: leagueId, name: newLeagueName, isActive: true });
      }

      setMatchRegisterMsg({ type: "success", text: "Partida customizada cadastrada com sucesso!" });
      setNewHomeTeam("");
      setNewAwayTeam("");
      setNewLeagueName("");
      setNewHomeOdd(2.0);
      setNewDrawOdd(3.0);
      setNewAwayOdd(3.0);
      refreshAllData();
    } catch {
      setMatchRegisterMsg({ type: "error", text: "Erro ao criar partida." });
    }
  }

  async function handleEndMatch(matchId: string, result: "home" | "draw" | "away" | "cancelled", corners?: number, cards?: number) {
    if (result === "cancelled") {
      await updateMatchStatus(matchId, "cancelled", null, corners, cards);
    } else {
      await updateMatchStatus(matchId, "finished", result, corners, cards);
    }
    refreshAllData();
  }

  async function handleToggleMatchActive(matchId: string, currentActive: boolean) {
    const list = matches.map(m => m.id === matchId ? { ...m, isActive: !currentActive } : m);
    // Overwrite match locally:
    const clicked = matches.find(m => m.id === matchId);
    if (clicked) {
      await saveMatch({ ...clicked, isActive: !currentActive });
    }
    refreshAllData();
  }

  // 4. Manual Odds & Margins Configuration Actions
  function handleInitEditMatchOdds(m: Match) {
    setEditingMatchOddsId(m.id);
    setOverrideHomeOdd(m.rawOdds?.homeWins ?? m.odds.homeWins);
    setOverrideDrawOdd(m.rawOdds?.draw ?? m.odds.draw);
    setOverrideAwayOdd(m.rawOdds?.awayWins ?? m.odds.awayWins);
    setOverrideMatchMargin(m.houseMarginOverride ?? systemConfig.houseMargin);
  }

  async function handleSaveMatchOddsOverride(matchId: string) {
    const originalMatch = matches.find(m => m.id === matchId);
    if (!originalMatch) return;
    
    // We update the Match's raw odds AND custom margin override
    const updatedRawOdds = {
      homeWins: overrideHomeOdd,
      draw: overrideDrawOdd,
      awayWins: overrideAwayOdd,
      over95_corners: originalMatch.rawOdds?.over95_corners ?? originalMatch.odds.over95_corners,
      under95_corners: originalMatch.rawOdds?.under95_corners ?? originalMatch.odds.under95_corners,
      over105_corners: originalMatch.rawOdds?.over105_corners ?? originalMatch.odds.over105_corners,
      under105_corners: originalMatch.rawOdds?.under105_corners ?? originalMatch.odds.under105_corners,
      over115_corners: originalMatch.rawOdds?.over115_corners ?? originalMatch.odds.over115_corners,
      under115_corners: originalMatch.rawOdds?.under115_corners ?? originalMatch.odds.under115_corners,
      over55_cards: originalMatch.rawOdds?.over55_cards ?? originalMatch.odds.over55_cards,
      under55_cards: originalMatch.rawOdds?.under55_cards ?? originalMatch.odds.under55_cards,
    };

    const calculatedActiveOdds = calculateOddsWithMargin(
      updatedRawOdds,
      systemConfig.houseMargin,
      originalMatch.league,
      systemConfig.leagueMargins || {},
      overrideMatchMargin
    );

    try {
      await saveMatch({
        ...originalMatch,
        rawOdds: updatedRawOdds,
        houseMarginOverride: overrideMatchMargin,
        odds: calculatedActiveOdds
      });
      setEditingMatchOddsId(null);
      alert("Odds e Margem do jogo salvas com sucesso!");
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao salvar odds: " + err.message);
    }
  }

  async function handleSaveLeagueMargin(leagueName: string, marginValue: number) {
    if (isNaN(marginValue) || marginValue < 0 || marginValue > 100) {
      alert("Margem inválida. Insira um número entre 0 e 100.");
      return;
    }
    const updatedLeagueMargins = {
      ...leagueMargins,
      [leagueName]: marginValue
    };
    
    try {
      const newConfig = {
        ...systemConfig,
        leagueMargins: updatedLeagueMargins
      };
      await saveSystemConfig(newConfig);
      
      // Propagate odds
      for (const m of matches) {
        if (m.league === leagueName && m.houseMarginOverride === undefined) {
          const matchRawOdds = m.rawOdds || m.odds; 
          const recalculatedOdds = calculateOddsWithMargin(
            matchRawOdds,
            newConfig.houseMargin,
            m.league,
            updatedLeagueMargins,
            undefined
          );
          await saveMatch({
            ...m,
            rawOdds: matchRawOdds,
            odds: recalculatedOdds
          });
        }
      }
      
      alert(`Margem da competição "${leagueName}" configurada como ${marginValue}% e correspondentes odds atualizadas!`);
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao salvar margem da competição: " + err.message);
    }
  }

  async function handleRemoveLeagueMargin(leagueName: string) {
    const updatedLeagueMargins = { ...leagueMargins };
    delete updatedLeagueMargins[leagueName];
    
    try {
      const newConfig = {
        ...systemConfig,
        leagueMargins: updatedLeagueMargins
      };
      await saveSystemConfig(newConfig);

      // Recalculate match odds
      for (const m of matches) {
        if (m.league === leagueName && m.houseMarginOverride === undefined) {
          const matchRawOdds = m.rawOdds || m.odds; 
          const recalculatedOdds = calculateOddsWithMargin(
            matchRawOdds,
            newConfig.houseMargin,
            m.league,
            updatedLeagueMargins,
            undefined
          );
          await saveMatch({
            ...m,
            rawOdds: matchRawOdds,
            odds: recalculatedOdds
          });
        }
      }
      
      alert(`Margem personalizada da competição "${leagueName}" removida!`);
      refreshAllData();
    } catch (err: any) {
      alert("Erro ao remover: " + err.message);
    }
  }

  // 3. Configurations actions
  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setConfigMsg({ type: "", text: "" });

    try {
      await saveSystemConfig({
        houseMargin: houseMarginInput,
        apiUrl: sportsApiUrl,
        apiKey: sportsApiKey,
        socialInstagram,
        socialTelegram,
        socialTwitter,
        supportWhatsapp,
        apiKeyTheOdds,
        apiFootballKey,
        footballDataToken,
        leagueMargins
      });
      setConfigMsg({ type: "success", text: "Configurações gerais atualizadas com sucesso!" });
      refreshAllData();
    } catch {
      setConfigMsg({ type: "error", text: "Erro salvando configurações." });
    }
  }

  async function executeApiSync() {
    setIsSyncing(true);
    try {
      const res = await triggerSportsApiSync();
      if (res.success) {
        alert(`Sucesso! Foram sincronizadas/importadas ${res.count} partidas da API com a margem descontada.`);
        refreshAllData();
      }
    } catch (err: any) {
      alert("Erro sincronizando com API: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  }

  // Filtering Cambistas State
  const searchNormalized = cambistaSearch.toLowerCase();
  const cambistasFiltered = users.filter(u => 
    u.role === "cambista" && 
    (u.name.toLowerCase().includes(searchNormalized) || u.phone.includes(searchNormalized))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-2">
            <Shield className="h-8 w-8 text-[#007BFF]" />
            Painel Central PH <span className="text-[#00AEEF] font-black">BET</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest leading-relaxed">
            PH BET CONTROLE EXCLUSIVO • MONITORANDO EM TEMPO REAL
          </p>
        </div>

        <button
          onClick={refreshAllData}
          className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 font-black transition self-start md:self-auto cursor-pointer shadow-xs"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Dados
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex border-b border-gray-200/80 flex-wrap gap-1 mb-8">
        <button
          id="admin-tab-metrics"
          onClick={() => setActiveSubTab("metrics")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "metrics"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Métricas e Estatísticas
        </button>

        <button
          id="admin-tab-cambistas"
          onClick={() => setActiveSubTab("cambistas")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "cambistas"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <Users className="h-4 w-4" />
          Gestão de Cambistas
        </button>

        <button
          id="admin-tab-fixtures"
          onClick={() => setActiveSubTab("fixtures")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "fixtures"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <Activity className="h-4 w-4" />
          Gerenciar Resultados
        </button>

        <button
          id="admin-tab-odds"
          onClick={() => setActiveSubTab("odds")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "odds"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <Award className="h-4 w-4" />
          Odds e Margens Globais
        </button>

        <button
          id="admin-tab-finance"
          onClick={() => setActiveSubTab("finance")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "finance"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Extrato Financeiro
        </button>

        <button
          id="admin-tab-config"
          onClick={() => setActiveSubTab("config")}
          className={`px-5 py-3.5 text-xs font-black tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeSubTab === "config"
              ? "border-[#007BFF] text-[#007BFF]"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
        >
          <Settings className="h-4 w-4" />
          Config da Banca & API
        </button>
      </div>

      {/* METRICS SUBPAGE */}
      {activeSubTab === "metrics" && (
        <div className="space-y-6">
          {/* Card stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <Landmark className="h-6 w-6 text-[#007BFF]" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Balanço das Regras (Banca)</span>
                <span className={`block text-xl font-extrabold ${bancaProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  R$ {bancaProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
              <div className="bg-amber-50 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Faturamento Hoje</span>
                <span className="block text-xl font-extrabold text-gray-900">
                  R$ {faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
              <div className="bg-teal-50 p-3 rounded-xl">
                <Users className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Total de Agentes</span>
                <span className="block text-xl font-extrabold text-gray-900">{countCambistas} Cambistas</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-xl">
                <Award className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">Apostas Registradas</span>
                <span className="block text-xl font-extrabold text-gray-900">{bets.length} Bilhetes</span>
              </div>
            </div>
          </div>

          {/* Revenue period comparisons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Gráfico de Faturamento Comparativo</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Hoje</span>
                    <span>R$ {faturamentoHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full duration-500 ease-out" style={{ width: `${Math.min(100, (faturamentoHoje / (totalStakes || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Últimos 7 dias</span>
                    <span>R$ {faturamento7d.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full duration-500 ease-out" style={{ width: `${Math.min(100, (faturamento7d / (totalStakes || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Últimos 30 dias</span>
                    <span>R$ {faturamento30d.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full duration-500 ease-out" style={{ width: `${Math.min(100, (faturamento30d / (totalStakes || 1)) * 100)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>Volume Acumulado Geral (Histórico)</span>
                    <span>R$ {totalStakes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-purple-600 h-full" style={{ width: "100%" }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats distribution */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">Resumo de Balanços</h3>
                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between font-bold border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Volume Bruto Recebido:</span>
                    <span className="text-gray-900">R$ {totalStakes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Prêmios Pagos (Ganhos):</span>
                    <span className="text-rose-600">- R$ {totalPayouts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-bold border-b border-gray-50 pb-2">
                    <span className="text-gray-500">Comissões de Cambista:</span>
                    <span className="text-sky-600">- R$ {totalPaidCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-blue-50 p-4 rounded-xl border border-blue-100/50">
                <span className="block text-[10px] font-black text-blue-800 uppercase tracking-wider">Rentabilidade da Banca</span>
                <span className="block text-2xl font-black mt-1 text-blue-950 font-mono">
                  {totalStakes > 0 ? `${((bancaProfit / totalStakes) * 100).toFixed(1)}%` : "0.0%"}
                </span>
                <span className="text-[10px] text-gray-500 block mt-0.5">Retenção de lucro descontando prêmios e bônus.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CAMBISTAS SUBPAGE */}
      {activeSubTab === "cambistas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Register box */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-1.5 uppercase">
              <PlusCircle className="h-5 w-5 text-blue-700" />
              Cadastrar Cambista
            </h3>

            {cambistaRegisterMsg.text && (
              <div className={`mb-4 p-3 rounded text-xs leading-5 flex items-start gap-1.5 ${
                cambistaRegisterMsg.type === "success" ? "bg-emerald-50 text-emerald-950 border-l-4 border-emerald-500" : "bg-red-50 text-red-950 border-l-4 border-red-500"
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{cambistaRegisterMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleRegisterCambista} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nome Completo</label>
                <input
                  id="admin-new-cambista-name"
                  type="text"
                  required
                  value={newCambistaName}
                  onChange={(e) => setNewCambistaName(e.target.value)}
                  placeholder="Nome do operador"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email de Login</label>
                <input
                  id="admin-new-cambista-email"
                  type="email"
                  required
                  value={newCambistaEmail}
                  onChange={(e) => setNewCambistaEmail(e.target.value)}
                  placeholder="parceiro@email.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Telefone / WhatsApp</label>
                <input
                  id="admin-new-cambista-phone"
                  type="tel"
                  required
                  value={newCambistaPhone}
                  onChange={(e) => setNewCambistaPhone(e.target.value)}
                  placeholder="Ex: 11977778888"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Senha Provisória</label>
                <input
                  id="admin-new-cambista-password"
                  type="password"
                  required
                  value={newCambistaPass}
                  onChange={(e) => setNewCambistaPass(e.target.value)}
                  placeholder="Defina uma senha provisória"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Taxa de Comissão (%)</label>
                <input
                  id="admin-new-cambista-commission"
                  type="number"
                  min="5"
                  max="50"
                  required
                  value={newCambistaCommission}
                  onChange={(e) => setNewCambistaCommission(parseInt(e.target.value) || 15)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold"
                />
                <span className="block text-[10px] text-gray-400 mt-1">Sugerido: 10% a 25% do valor da aposta.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Limite de Banca (R$)</label>
                <input
                  id="admin-new-cambista-banklimit"
                  type="number"
                  min="0"
                  required
                  value={newCambistaBankLimit}
                  onChange={(e) => setNewCambistaBankLimit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
                <span className="block text-[10px] text-gray-400 mt-1">Limite máximo de crédito para jogos (0 para sem limite).</span>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-xs py-2.5 rounded-xl transition shadow"
              >
                Cadastrar Agente Cambista
              </button>
            </form>
          </div>

          {/* List and manage */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <h3 className="text-base font-black text-gray-900 uppercase">Cambistas Registrados</h3>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar cambista..."
                  value={cambistaSearch}
                  onChange={(e) => setCambistaSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100 text-[11px] text-blue-800">
              <p className="font-extrabold flex items-center gap-1.5 leading-snug">
                <span>💡</span>
                <span>Comissão Personalizada por Cambista</span>
              </p>
              <p className="font-medium text-blue-600 mt-1">
                Altere a porcentagem individual para cada parceiro digitando o valor desejado diretamente na coluna <strong className="font-black">Comissão (%)</strong>. O sistema salva as mudanças instantaneamente e as aplicará sobre novas apostas intermediadas!
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-600">
                <thead>
                  <tr className="bg-gray-50 font-bold text-gray-400 uppercase tracking-widest text-[9px] border-b border-gray-100">
                    <th className="py-2.5 px-3">Nome / Contato</th>
                    <th className="py-2.5 px-3">Comissão (%)</th>
                    <th className="py-2.5 px-3">Limite de Banca</th>
                    <th className="py-2.5 px-3">Faturamento Realizado</th>
                    <th className="py-2.5 px-3">Comissões Acumuladas</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cambistasFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 font-bold">Nenhum cambista encontrado.</td>
                    </tr>
                  ) : (
                    cambistasFiltered.map((c) => {
                      // Retrieve actual partner betting handle total
                      const partnerBets = bets.filter(b => b.cambistaId === c.uid);
                      const faturamentoGeral = partnerBets.reduce((acc, b) => acc + b.stake, 0);
                      const comissãoAcumulada = partnerBets
                        .filter(b => b.commissionStatus === "validated")
                        .reduce((acc, b) => acc + (b.commissionValue || 0), 0);

                      return (
                        <tr key={c.uid} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3 font-extrabold text-gray-900">
                            <span>{c.name}</span>
                            <span className="block text-[10px] text-gray-400 font-mono mt-0.5">{c.email} • {c.phone}</span>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              id={`cambista-commission-input-${c.uid}`}
                              type="number"
                              min="0"
                              max="100"
                              value={c.commissionPercentage}
                              onChange={(e) => updateCambistaPercentage(c.uid, parseInt(e.target.value) || 0)}
                              className="w-16 bg-gray-50 border border-gray-200 p-1 text-center font-bold rounded"
                            />
                            <span className="text-[10px] ml-1 font-bold text-gray-400">%</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-[11px] block w-fit">
                              {c.bankLimit ? `R$ ${c.bankLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem limite"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-950">
                            R$ {faturamentoGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-600">
                            R$ {comissãoAcumulada.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              c.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                            }`}>
                              {c.status === "active" ? "Ativo" : "Bloqueado"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleOpenEditCambista(c)}
                                className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1"
                              >
                                Editar
                              </button>
                              <button
                                id={`toggle-block-cambista-${c.uid}`}
                                onClick={() => toggleBlockCambista(c.uid, c.status)}
                                className={`px-2 py-1 rounded text-[10px] font-extrabold cursor-pointer text-white flex items-center gap-1 transition-colors ${
                                  c.status === "active" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                                }`}
                              >
                                <Ban className="h-3 w-3" />
                                {c.status === "active" ? "Bloquear" : "Desbloquear"}
                              </button>
                              <button
                                onClick={() => handleRemoveCambista(c)}
                                className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 transition-colors"
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CAMBISTA MODAL POPUP Overlay */}
      {editingCambista && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-gray-800">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-gray-100 shadow-2xl relative animate-fade-in text-xs">
            <h3 className="text-sm font-black text-gray-900 uppercase mb-4 pb-2 border-b border-gray-100 flex items-center gap-1.5">
              ✍️ Editar Cambista: {editingCambista.name}
            </h3>
            <form onSubmit={handleSaveEditCambista} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={editCambistaName}
                  onChange={(e) => setEditCambistaName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Email de Login</label>
                <input
                  type="email"
                  required
                  value={editCambistaEmail}
                  onChange={(e) => setEditCambistaEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 font-sans">Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={editCambistaPhone}
                  onChange={(e) => setEditCambistaPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Taxa de Comissão (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={editCambistaCommission}
                  onChange={(e) => setEditCambistaCommission(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Limite de Banca (R$)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={editCambistaBankLimit}
                  onChange={(e) => setEditCambistaBankLimit(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-700"
                />
                <span className="block text-[9px] text-gray-400 mt-1">Limite de crédito para jogos (0 para sem limite).</span>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Nova Senha (deixe vazio para não alterar)</label>
                <input
                  type="password"
                  value={editCambistaPass}
                  onChange={(e) => setEditCambistaPass(e.target.value)}
                  placeholder="Defina uma nova senha se quiser"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingCambista(null)}
                  className="px-4 py-2 text-[11px] font-bold bg-gray-150 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCLUDE CAMBISTA CUSTOM CONFIRMATION DIALOG POPUP Overlay */}
      {cambistaToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-gray-800">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 border border-red-100 shadow-2xl relative animate-fade-in text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-xl">⚠️</span>
            </div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight mb-2">Excluir Cambista?</h3>
            <p className="text-xs text-gray-650 leading-relaxed mb-6">
              Atenção: Tem certeza que deseja remover permanentemente o cambista <strong>{cambistaToDelete.name}</strong> ({cambistaToDelete.email})? Esta ação excluirá seus dados de acesso da PH BET irreversivelmente.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => setCambistaToDelete(null)}
                className="px-4 py-2 text-[11px] font-bold bg-gray-150 text-gray-700 rounded-xl hover:bg-gray-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeRemoveCambista}
                className="px-4 py-2 text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl cursor-pointer shadow-md shadow-red-200"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXTURES SPORTS SUBPAGE */}
      {activeSubTab === "fixtures" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Create game entry */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit">
            <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-1.5 uppercase">
              <PlusCircle className="h-5 w-5 text-blue-700" />
              Cadastrar Jogo / Odds
            </h3>

            {matchRegisterMsg.text && (
              <div className={`mb-4 p-3 rounded text-xs flex items-start gap-1.5 ${
                matchRegisterMsg.type === "success" ? "bg-emerald-50 text-emerald-900 border-l-4 border-emerald-500" : "bg-red-50 text-red-900 border-l-4 border-red-500"
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{matchRegisterMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleRegisterMatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Time Mandante (Casa)</label>
                <input
                  id="admin-new-match-home"
                  type="text"
                  required
                  value={newHomeTeam}
                  onChange={(e) => setNewHomeTeam(e.target.value)}
                  placeholder="Ex: Santos"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Time Visitante (Fora)</label>
                <input
                  id="admin-new-match-away"
                  type="text"
                  required
                  value={newAwayTeam}
                  onChange={(e) => setNewAwayTeam(e.target.value)}
                  placeholder="Ex: Vasco"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Campeonato / Liga</label>
                <input
                  id="admin-new-match-league"
                  type="text"
                  required
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  placeholder="Ex: Brasileirão Série A"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-bold text-gray-850"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Odd Mandante</label>
                  <input
                    id="admin-new-match-odd-home"
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={newHomeOdd}
                    onChange={(e) => setNewHomeOdd(parseFloat(e.target.value) || 2.0)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Odd Empate</label>
                  <input
                    id="admin-new-match-odd-draw"
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={newDrawOdd}
                    onChange={(e) => setNewDrawOdd(parseFloat(e.target.value) || 3.0)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Odd Fora</label>
                  <input
                    id="admin-new-match-odd-away"
                    type="number"
                    step="0.01"
                    min="1.01"
                    required
                    value={newAwayOdd}
                    onChange={(e) => setNewAwayOdd(parseFloat(e.target.value) || 3.0)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-center font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-xs py-2.5 rounded-xl transition shadow"
              >
                Ativar & Publicar Partida
              </button>
            </form>
          </div>

          {/* Settle results listings */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-50 pb-4 uppercase">Súmulas e Gestão de Partidas</h3>

            <div className="space-y-4">
              {matches.map((m) => (
                <div key={m.id} className="p-4 rounded-xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50/55 px-1.5 py-0.5 rounded tracking-wide">{m.league}</span>
                    <h4 className="font-extrabold text-sm text-gray-900 mt-1.5">{m.homeTeam} x {m.awayTeam}</h4>
                    <span className="block text-[10px] text-gray-400 mt-0.5 font-bold">Data: {m.date} | Status: <span className="uppercase text-blue-600">{m.status}</span></span>
                  </div>

                  {m.status === "pending" ? (
                    <div className="flex flex-col gap-3 shrink-0 bg-gray-50/50 p-3 rounded-xl border border-gray-100 md:w-96 font-sans">
                      {/* Advanced results inputs */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-black text-gray-500 uppercase">🚩 Escanteios (Total)</label>
                          <input
                            type="number"
                            min="0"
                            value={matchCornersResult[m.id] ?? 10}
                            onChange={(e) => setMatchCornersResult({
                              ...matchCornersResult,
                              [m.id]: parseInt(e.target.value) || 0
                            })}
                            className="w-full mt-1 bg-white border border-gray-200 text-xs px-2 py-1 rounded font-bold text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-gray-500 uppercase">🎴 Cartões (Total)</label>
                          <input
                            type="number"
                            min="0"
                            value={matchCardsResult[m.id] ?? 5}
                            onChange={(e) => setMatchCardsResult({
                              ...matchCardsResult,
                              [m.id]: parseInt(e.target.value) || 0
                            })}
                            className="w-full mt-1 bg-white border border-gray-200 text-xs px-2 py-1 rounded font-bold text-gray-900"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1.5 w-full mt-1">
                        <button
                          id={`settle-match-home-${m.id}`}
                          onClick={() => handleEndMatch(
                            m.id, 
                            "home", 
                            matchCornersResult[m.id] ?? 10, 
                            matchCardsResult[m.id] ?? 5
                          )}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] py-1.5 rounded transition cursor-pointer text-center uppercase"
                        >
                          Vitória Casa
                        </button>
                        <button
                          id={`settle-match-draw-${m.id}`}
                          onClick={() => handleEndMatch(
                            m.id, 
                            "draw", 
                            matchCornersResult[m.id] ?? 10, 
                            matchCardsResult[m.id] ?? 5
                          )}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[9px] py-1.5 rounded transition cursor-pointer text-center uppercase"
                        >
                          Empate
                        </button>
                        <button
                          id={`settle-match-away-${m.id}`}
                          onClick={() => handleEndMatch(
                            m.id, 
                            "away", 
                            matchCornersResult[m.id] ?? 10, 
                            matchCardsResult[m.id] ?? 5
                          )}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] py-1.5 rounded transition cursor-pointer text-center uppercase"
                        >
                          Vitória Fora
                        </button>
                      </div>

                      <div className="flex justify-between items-center text-[10px] border-t border-gray-100 pt-1.5">
                        <button
                          id={`toggle-disable-match-${m.id}`}
                          onClick={() => handleToggleMatchActive(m.id, m.isActive)}
                          className={`text-[9px] font-bold ${m.isActive ? "text-rose-600 hover:underline" : "text-emerald-600 hover:underline"}`}
                        >
                          {m.isActive ? "📴 Ocultar do Site" : "🔌 Ativar Visibilidade"}
                        </button>
                        <button 
                          id={`settle-match-cancel-${m.id}`}
                          onClick={() => handleEndMatch(m.id, "cancelled", 0, 0)}
                          className="text-[9px] text-gray-400 hover:text-red-500 hover:underline font-bold"
                        >
                          Anular Jogo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-100 p-2.5 rounded-lg text-xs font-black text-gray-700 flex flex-col items-end gap-1 font-sans">
                      <div className="flex items-center gap-1.5">
                        <CircleCheck className="h-4 w-4 text-emerald-600 font-bold" />
                        <span>Resolvido: {m.status === "cancelled" ? "Cancelado" : `Vitória ${m.result === "home" ? "Casa" : m.result === "draw" ? "Empate" : "Fora"}`}</span>
                      </div>
                      {m.status !== "cancelled" && (
                        <div className="text-[10px] text-gray-400 font-bold block">
                          🚩 Escanteios: {m.footballCorners ?? 0} | 🎴 Cartões: {m.footballCards ?? 0}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ODDS E MARGENS GLOBAIS SUBPAGE */}
      {activeSubTab === "odds" && (
        <div className="space-y-8 text-xs text-gray-700">
          
          {/* Top Row: General House Margin & Championship Margins */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Box 1: Global Margin Config */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900 mb-2 flex items-center gap-1.5 uppercase">
                  <span>🚩</span>Margem Geral da Banca
                </h3>
                <p className="text-[11px] text-gray-400 mb-4 leading-relaxed font-semibold">
                  Aplica um percentual de redução geral sobre as odds da API em tempo real. Ex: Margem de 10% reduz uma odd de 3.00 para 2.70.
                </p>
                
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100/80 mb-6 text-blue-800 text-[11px]">
                  <strong>Margem Global Atual: <span className="text-[#007BFF] font-black text-sm">{systemConfig.houseMargin}%</span></strong>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Definir Novo Percentual (%)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={houseMarginInput}
                        onChange={(e) => setHouseMarginInput(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#007BFF]"
                      />
                      <span className="font-extrabold text-[#007BFF] text-base w-10 shrink-0">{houseMarginInput}%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-2">Desconto Bet Builder (%)</label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={betBuilderDiscount}
                        onChange={(e) => setBetBuilderDiscount(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                      <span className="font-extrabold text-emerald-600 text-base w-10 shrink-0">{betBuilderDiscount}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50 mt-6">
                <button
                  onClick={async () => {
                    try {
                      await saveSystemConfig({
                        ...systemConfig,
                        houseMargin: houseMarginInput,
                        betBuilderDiscount: betBuilderDiscount
                      });
                      
                      // Dynamic update odds
                      for (const m of matches) {
                        if (m.houseMarginOverride === undefined) {
                          const mRaw = m.rawOdds || m.odds;
                          const mRecalc = calculateOddsWithMargin(
                            mRaw,
                            houseMarginInput,
                            m.league,
                            systemConfig.leagueMargins || {},
                            undefined
                          );
                          await saveMatch({
                            ...m,
                            rawOdds: mRaw,
                            odds: mRecalc
                          });
                        }
                      }
                      
                      alert(`Margem Geral da Banca configurada como ${houseMarginInput}% com sucesso!`);
                      refreshAllData();
                    } catch (err: any) {
                      alert("Erro ao salvar margem: " + err.message);
                    }
                  }}
                  className="w-full bg-[#007BFF] hover:bg-[#0056b3] text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs uppercase tracking-wide"
                >
                  Salvar Margem Geral & Atualizar Odds
                </button>
              </div>
            </div>

            {/* Box 2: Margins by Championship/Competition */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5 uppercase">
                <span>🏆</span>Margem por Competição (Campeonatos)
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                Personalize a margem de lucro da banca para campeonatos específicos. A margem da competição substitui a margem global nos jogos correspondentes.
              </p>

              {/* Add competition margin form */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Selecionar Campeonato</label>
                  <select
                    id="league-margin-selector"
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold"
                  >
                    {leagues.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-full sm:w-28 shrink-0">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Margem (%)</label>
                  <input
                    id="league-margin-input"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="10"
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-center font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const selEl = document.getElementById("league-margin-selector") as HTMLSelectElement;
                    const valEl = document.getElementById("league-margin-input") as HTMLInputElement;
                    if (selEl && valEl) {
                      handleSaveLeagueMargin(selEl.value, parseInt(valEl.value) || 10);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-4 py-2 rounded-lg cursor-pointer transition uppercase"
                >
                  Aplicar Margem
                </button>
              </div>

              {/* Active list of margins by championship */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-gray-600">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 text-[10px] uppercase">
                      <th className="py-2.5 px-3">Competição / Liga</th>
                      <th className="py-2.5 px-3 text-center">Margem Aplicada</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.keys(leagueMargins).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-gray-400 font-bold">Nenhum campeonato com margem personalizada. Utilizando margem geral do site.</td>
                      </tr>
                    ) : (
                      Object.entries(leagueMargins).map(([lName, mVal]) => (
                        <tr key={lName}>
                          <td className="py-3 px-3 font-extrabold text-gray-900">{lName}</td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-blue-50 text-blue-700">{mVal}%</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleRemoveLeagueMargin(lName)}
                              className="text-[10px] text-red-500 hover:text-red-700 font-black cursor-pointer"
                            >
                              Remover Alteração
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Table: Configure Manual Odds Per Match */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5 uppercase">
              <span>⚽</span>Configurações Específicas por Jogo (Confronto Direto)
            </h3>
            <p className="text-[11px] text-gray-400 font-semibold">
              O Admin do PH BET tem controle supremo. Visualize as odds originais (Raw Odds) importadas da API e defina margens e cotações personalizadas jogo a jogo.
            </p>

            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left text-gray-600 table-auto">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 text-[10px] uppercase">
                    <th className="py-3 px-3">Partida / Competição</th>
                    <th className="py-3 px-3 text-center">Odds Originais (API)</th>
                    <th className="py-3 px-3 text-center">Margem do Jogo</th>
                    <th className="py-3 px-3 text-center">Odds Finais Ativas</th>
                    <th className="py-3 px-3 text-right">Ação Direta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-gray-400 font-bold">Nenhum jogo cadastrado. Importe com a sincronização ou adicione um jogo manualmente.</td>
                    </tr>
                  ) : (
                    matches.map(m => {
                      const isEditingThisMatch = editingMatchOddsId === m.id;
                      const customMarginUsed = m.houseMarginOverride !== undefined;
                      const activeMargin = m.houseMarginOverride ?? (systemConfig.leagueMargins?.[m.league] ?? systemConfig.houseMargin);
                      
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/20">
                          <td className="py-4 px-3 max-w-xs">
                            <span className="block text-[9px] font-black uppercase text-blue-600 tracking-wider bg-blue-50 w-fit px-1.5 rounded mb-1">{m.league}</span>
                            <span className="block font-extrabold text-gray-900 text-[13px]">{m.homeTeam} x {m.awayTeam}</span>
                            <span className="block text-[10px] text-gray-400 font-bold mt-0.5">🗓️ Data: {m.date} | ID: {m.id}</span>
                          </td>
                          <td className="py-4 px-3 text-center font-mono font-medium">
                            {m.rawOdds ? (
                              <div className="text-[11px] text-gray-450 block space-x-1.5">
                                <span>Casa: <strong>{m.rawOdds.homeWins}</strong></span>
                                <span>Empate: <strong>{m.rawOdds.draw}</strong></span>
                                <span>Fora: <strong>{m.rawOdds.awayWins}</strong></span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Mesmas Finais (Sem Raw)</span>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditingThisMatch ? (
                              <div className="flex justify-center items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={overrideMatchMargin}
                                  onChange={(e) => setOverrideMatchMargin(parseInt(e.target.value) || 0)}
                                  className="w-14 text-center bg-gray-50 border border-gray-300 font-bold rounded p-1"
                                />
                                <span className="font-bold text-gray-400">%</span>
                              </div>
                            ) : (
                              <div className="block">
                                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded">
                                  {activeMargin}%
                                </span>
                                <span className="block text-[9px] text-gray-400 font-bold mt-1">
                                  {customMarginUsed ? "⚠️ JOGO OVERRIDE" : "Herdado comp/geral"}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-center">
                            {isEditingThisMatch ? (
                              <div className="flex gap-2 justify-center max-w-sm mx-auto">
                                <div className="text-center">
                                  <span className="block text-[8px] font-bold text-gray-400 uppercase">Casa (Odd)</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                    value={overrideHomeOdd}
                                    onChange={(e) => setOverrideHomeOdd(parseFloat(e.target.value) || 2.0)}
                                    className="w-14 text-center bg-gray-50 border border-gray-300 font-extrabold  p-1 rounded text-[11px]"
                                  />
                                </div>
                                <div className="text-center">
                                  <span className="block text-[8px] font-bold text-gray-400 uppercase">Empate</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                    value={overrideDrawOdd}
                                    onChange={(e) => setOverrideDrawOdd(parseFloat(e.target.value) || 3.0)}
                                    className="w-14 text-center bg-gray-50 border border-gray-300 font-extrabold  p-1 rounded text-[11px]"
                                  />
                                </div>
                                <div className="text-center">
                                  <span className="block text-[8px] font-bold text-gray-400 uppercase">Fora</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                    value={overrideAwayOdd}
                                    onChange={(e) => setOverrideAwayOdd(parseFloat(e.target.value) || 2.0)}
                                    className="w-14 text-center bg-gray-50 border border-gray-300 font-extrabold  p-1 rounded text-[11px]"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-[12px] font-black text-gray-900 block space-x-2">
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-sans">1: <strong>{m.odds.homeWins}</strong></span>
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-sans">X: <strong>{m.odds.draw}</strong></span>
                                <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded font-mono font-sans">2: <strong>{m.odds.awayWins}</strong></span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-3 text-right">
                            {isEditingThisMatch ? (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => setEditingMatchOddsId(null)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-gray-100 text-gray-700 hover:bg-gray-200 rounded cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveMatchOddsOverride(m.id)}
                                  className="px-2.5 py-1 text-[10px] font-black bg-emerald-600 text-white hover:bg-emerald-700 rounded cursor-pointer"
                                >
                                  Salvar Com Margem
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleInitEditMatchOdds(m)}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded cursor-pointer"
                              >
                                Editar Odds/Margem
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* FINANCE STATEMENTS SUBPAGE */}
      {activeSubTab === "finance" && (() => {
        // Prepare filtered list inside a closure
        const filtered = bets.filter((b) => {
          if (selectedCambistaFilter !== "all" && b.cambistaId !== selectedCambistaFilter) {
            return false;
          }
          if (startDateFilter) {
            if (b.createdAt < startDateFilter) return false;
          }
          if (endDateFilter) {
            const normalizedEnd = endDateFilter.includes("T") ? endDateFilter : `${endDateFilter}T23:59:59`;
            if (b.createdAt > normalizedEnd) return false;
          }
          return true;
        });

        const totalSales = filtered.reduce((acc, b) => acc + b.stake, 0);
        const totalPaidCommissions = filtered
          .filter(b => b.commissionStatus === "validated")
          .reduce((acc, b) => acc + (b.commissionValue || 0), 0);
        const totalPayoutLosses = filtered
          .filter(b => b.status === "won")
          .reduce((acc, b) => acc + b.potentialPayout, 0);
        const netProfit = totalSales - totalPaidCommissions - totalPayoutLosses;

        return (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-50 pb-4 uppercase flex items-center gap-2">
              <span>📊</span>Livro de Apostas e Auditoria de Comissões
            </h3>
            <button
                onClick={async () => {
                  if (confirm("TEM CERTEZA QUE DESEJA ZERAR TODOS OS JOGOS E APOSTAS? ESTA AÇÃO NÃO PODE SER DESFEITA.")) {
                      try {
                        const button = document.getElementById("admin-reset-btn");
                        if (button) button.innerText = "Zerando...";
                        
                        console.log("Action triggered: Resetting all data");
                        await adminResetEverything();
                        
                        console.log("Action triggered: Data reset complete");
                        alert("Dados do site zerados com sucesso!");
                        
                        refreshAllData();
                        if (button) button.innerText = "ZERAR DADOS DO SITE";
                      } catch (err: any) {
                        console.error("Detailed Reset error:", err);
                        alert("ERRO CRÍTICO ao zerar dados: " + (err.message || String(err)));
                      }
                  }
                }}
                id="admin-reset-btn"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm flex items-center gap-2"
              >
                <Ban size={14} /> ZERAR DADOS DO SITE
              </button>

            {/* Filter controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-150">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Filtrar por Cambista</label>
                <select
                  value={selectedCambistaFilter}
                  onChange={(e) => setSelectedCambistaFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold"
                >
                  <option value="all">Todos os Cambistas (Geral)</option>
                  {users.filter(u => u.role === "cambista").map(u => (
                    <option key={u.uid} value={u.uid}>{u.name} (ID: {u.uid.slice(0, 5)})</option>
                  ))}
                  <option value="">Apostas Sem Cambista (Venda Site)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Data Inicial (Opcional)</label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">Data Final (Opcional)</label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-800"
                />
              </div>
            </div>

            {/* Micro bento totals row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-10/70">
                <span className="block text-[9px] text-blue-500 font-extrabold uppercase">Faturamento (Vendas)</span>
                <span className="block text-lg font-black text-blue-900 mt-1">R$ {totalSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span className="block text-[9px] text-gray-400 mt-0.5">{filtered.length} bilhetes</span>
              </div>

              <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-10/70">
                <span className="block text-[9px] text-amber-600 font-extrabold uppercase">Comissões Devidas</span>
                <span className="block text-lg font-black text-amber-900 mt-1">R$ {totalPaidCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span className="block text-[9px] text-gray-400 mt-0.5">Comissão validada</span>
              </div>

              <div className="bg-red-50/40 p-4 rounded-xl border border-red-10/70">
                <span className="block text-[9px] text-red-500 font-extrabold uppercase">Prêmios Pagos (Payout)</span>
                <span className="block text-lg font-black text-red-900 mt-1">R$ {totalPayoutLosses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span className="block text-[9px] text-gray-400 mt-0.5">Bilhetes ganhos</span>
              </div>

              <div className={`p-4 rounded-xl border ${netProfit >= 0 ? "bg-emerald-50/40 border-emerald-100" : "bg-red-50/40 border-red-100"}`}>
                <span className="block text-[9px] font-extrabold uppercase text-gray-500">Resultado Líquido do Período</span>
                <span className={`block text-lg font-black mt-1 ${netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span className="block text-[9px] text-gray-400 mt-0.5">Lucro da Banca</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-600">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 font-bold text-gray-400 text-[9px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Código / Data</th>
                    <th className="py-2.5 px-3">Apostador / WhatsApp</th>
                    <th className="py-2.5 px-3">Jogos Selecionados</th>
                    <th className="py-2.5 px-3">Aposta (Stake)</th>
                    <th className="py-2.5 px-3">Retorno Estimado</th>
                    <th className="py-2.5 px-3">Status Bilhete</th>
                    <th className="py-2.5 px-3">Cambista Intermediador</th>
                    <th className="py-2.5 px-3">Comissão Cambista</th>
                    <th className="py-2.5 px-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400 font-bold">Nenhum bilhete com os filtros selecionados.</td>
                    </tr>
                  ) : (
                    [...filtered].reverse().map((b) => {
                      const agentProfile = b.cambistaId ? users.find((u) => u.uid === b.cambistaId) : null;

                      return (
                        <tr key={b.id} className="hover:bg-gray-50/50">
                          <td className="py-3 px-3">
                            <span className="font-extrabold text-blue-800 block">{b.id}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5">{new Date(b.createdAt).toLocaleString()}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-gray-900 block">{b.customerName}</span>
                            {b.customerPhone && <span className="text-[9px] text-gray-400 font-mono italic">{b.customerPhone}</span>}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="space-y-1 text-[10px]">
                              {b.matches.map((sm) => (
                                <div key={`${sm.matchId}_${sm.prediction}`} className="leading-tight">
                                  <span className="font-semibold text-gray-800">{sm.homeTeam}x{sm.awayTeam}</span>
                                  <span className="text-gray-400 ml-1">({sm.prediction})</span>
                                  <span className={`ml-1 px-1 font-bold rounded ${
                                    sm.status === "won" ? "bg-emerald-50 text-emerald-600" : sm.status === "lost" ? "bg-red-50 text-red-650" : "bg-gray-50 text-gray-500"
                                  }`}>
                                    {sm.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900">R$ {b.stake.toFixed(2)}</td>
                          <td className="py-3 px-3 font-black text-blue-700">R$ {b.potentialPayout.toFixed(2)}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                              b.status === "won" ? "bg-emerald-50 text-emerald-700" : b.status === "lost" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-gray-700">
                            {agentProfile ? agentProfile.name : "Venda Direta / Site"}
                          </td>
                          <td className="py-3 px-3">
                            {b.cambistaId && b.commissionValue ? (
                              <div>
                                <span className="font-bold text-emerald-600 block">R$ {b.commissionValue.toFixed(2)} ({b.commissionPercentage}%)</span>
                                <span className="text-[9px] text-gray-400 font-mono block mt-0.5">Ref: {b.commissionToken}</span>
                                <span className={`inline-block text-[8px] px-1 rounded uppercase font-bold mt-0.5 ${
                                  b.commissionStatus === "validated" ? "bg-emerald-50 text-emerald-700" : b.commissionStatus === "cancelled" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {b.commissionStatus}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {b.status !== "cancelled" && (
                              <button
                                onClick={() => handleCancelBet(b)}
                                className="bg-red-600 text-white font-extrabold px-3 py-1 rounded-md text-[9px] uppercase hover:bg-red-700 transition"
                              >
                                Cancelar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* CONFIG GENERAL AND API SUBPAGE */}
      {activeSubTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main system margins */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit space-y-4">
            <h3 className="text-base font-black text-gray-900 flex items-center gap-1.5 uppercase">
              <Settings className="h-5 w-5 text-blue-700" />
              Parâmetros da Banca
            </h3>

            {configMsg.text && (
              <div className={`p-3 rounded text-xs flex items-start gap-1.5 ${
                configMsg.type === "success" ? "bg-emerald-50 text-emerald-900 border-l-4 border-emerald-500" : "bg-red-50 text-red-900 border-l-4 border-red-500"
              }`}>
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{configMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Margem da Banca (%)</label>
                <select
                  id="admin-config-margin"
                  value={houseMarginInput}
                  onChange={(e) => setHouseMarginInput(parseInt(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-blue-500"
                >
                  <option value={5}>5% (Odds Super Elevadas)</option>
                  <option value={8}>8% (Margem Recomendada)</option>
                  <option value={10}>10% (Padrão de Mercado)</option>
                  <option value={12}>12% (Margem Elevada)</option>
                  <option value={15}>15% (Retenção Máxima)</option>
                </select>
                <span className="block text-[10px] text-gray-400 mt-1">A margem calcula o desconto automático das probabilidades aplicadas a todas as odds importadas da API de Futebol.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">API Endpoint URL</label>
                <input
                  id="admin-config-api-url"
                  type="text"
                  value={sportsApiUrl}
                  onChange={(e) => setSportsApiUrl(e.target.value)}
                  placeholder="https://v3.football.api-sports.io"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">API Key Secreta</label>
                <input
                  id="admin-config-api-key"
                  type="password"
                  value={sportsApiKey}
                  onChange={(e) => setSportsApiKey(e.target.value)}
                  placeholder="CHAVE DE AUTENTICAÇÃO API"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* SOCIAL CHANNELS SETUP */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-[11px] font-black text-gray-900 uppercase flex items-center gap-1">
                  <span>📱</span> Redes Sociais & WhatsApp
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">WhatsApp de Suporte (DDI + DDD + Num)</label>
                  <input
                    type="text"
                    value={supportWhatsapp}
                    onChange={(e) => setSupportWhatsapp(e.target.value)}
                    placeholder="Ex: 5543999998888"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Instagram Link</label>
                  <input
                    type="text"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/phbet"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Telegram Link</label>
                  <input
                    type="text"
                    value={socialTelegram}
                    onChange={(e) => setSocialTelegram(e.target.value)}
                    placeholder="https://t.me/phbet"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Twitter (X) Link</label>
                  <input
                    type="text"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    placeholder="https://x.com/phbet"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-bold"
                  />
                </div>
              </div>

              {/* ALTERNATIVE API KEYS FOR FALLBACKS */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-[11px] font-black text-gray-900 uppercase flex items-center gap-1">
                  <span>🗝️</span> Provedores Adicionais (Fallback / Reserva)
                </h4>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">The Odds API Key</label>
                  <input
                    type="password"
                    value={apiKeyTheOdds}
                    onChange={(e) => setApiKeyTheOdds(e.target.value)}
                    placeholder="Chave para The Odds API"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">API-Football Key</label>
                  <input
                    type="password"
                    value={apiFootballKey}
                    onChange={(e) => setApiFootballKey(e.target.value)}
                    placeholder="Chave para API-Football"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Football-Data.org Token (v4/matches)</label>
                  <input
                    type="password"
                    value={footballDataToken}
                    onChange={(e) => setFootballDataToken(e.target.value)}
                    placeholder="Token de Autenticação X-Auth-Token"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-800 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-xs py-2.5 rounded-xl transition shadow cursor-pointer uppercase tracking-wide"
              >
                Salvar Configurações Gerais
              </button>
            </form>

            {/* Danger Zone */}
            <div className="pt-8 mt-8 border-t border-gray-100">
              <h3 className="text-sm font-black text-rose-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                 <AlertCircle className="h-4 w-4" /> Zona de Perigo
              </h3>
              <p className="text-[10px] text-rose-600 mb-3">
                Esta ação apagará <strong>todos</strong> os jogos e <strong>todas</strong> as apostas. Irreversível.
              </p>
              <button
                onClick={async () => {
                  if (confirm("TEM CERTEZA? APAGAR TODOS OS JOGOS E APOSTAS?")) {
                    await adminResetEverything();
                    refreshAllData();
                    alert("Dados limpos com sucesso.");
                  }
                }}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                APAGAR TUDO (Jogos + Apostas)
              </button>
            </div>
          </div>

          {/* Sync Trigger and Logs */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-base font-black text-gray-900 uppercase">Sincronizador API de Jogos</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Integração futebolística pré-jogo em lote em tempo real.</p>
              </div>

              <button
                id="admin-trigger-sync"
                disabled={isSyncing}
                onClick={executeApiSync}
                className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-400 text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 font-black transition cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Importando Jogos..." : "Sincronizar Jogos Agora"}
              </button>
            </div>
            
            <AdminGameUpload onRefresh={refreshAllData} />

            {/* Sync logs Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest text-[9px]">Sincronizações Recentes</h4>
              {syncLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs border border-dashed rounded-xl">
                  Nenhuma sincronização foi registrada recentemente. Clique no botão acima para simular a primeira sincronização.
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-gray-50 bg-gray-50/50 text-xs space-y-1">
                      <div className="flex justify-between font-extrabold text-[11px]">
                        <span className="text-gray-900">Sincronização #{log.id}</span>
                        <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-gray-600 font-medium leading-relaxed">{log.details}</p>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-emerald-600 mt-1.5">
                        <span>📊 Jogos Importados: {log.importedCount}</span>
                        <span>✔️ Ativo</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
