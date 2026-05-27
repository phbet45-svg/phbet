import React, { useState, useEffect } from "react";
import { Bet, UserProfile, Match } from "../types";
import { 
  getBets, 
  getMatches, 
  subscribeToCollection, 
  getUserProfile, 
  subscribeToUserProfile, 
  getBetsByCambista, 
  getBetByPin, 
  getPendingBetsByCustomer,
  subscribeToBetsByCambista, 
  linkAllCustomerBetsToCambista, 
  recoverBetByPinTransaction 
} from "../lib/dbService";
import { useAuth } from "../contexts/AuthContext";
import { 
  DollarSign, BadgePercent, Coins, Calendar, CheckCircle, Clock, Search, ExternalLink, Bookmark, Key, Users, ShieldAlert
} from "lucide-react";
import { updateBet } from "../lib/dbService";

export default function CambistaPanel() {
  const { userProfile } = useAuth();
  
  const [bets, setBets] = useState<Bet[]>([]);
  const [personalProfile, setPersonalProfile] = useState<UserProfile | null>(null);
  const [betSearch, setBetSearch] = useState("");
  const [pinSearch, setPinSearch] = useState("");
  const [foundBet, setFoundBet] = useState<Bet | null>(null);
  const [customerPendingBets, setCustomerPendingBets] = useState<Bet[]>([]);
  const [view, setView] = useState<"bets" | "games">("bets");
  const [matches, setMatches] = useState<Match[]>([]);
  const [isRecoveringAll, setIsRecoveringAll] = useState(false);

  async function loadCambistaData() {
    if (!userProfile) return;
    try {
      // Reload updated user balance/percentage
      const updatedUser = await getUserProfile(userProfile.uid);
      setPersonalProfile(updatedUser);

      // Load MY bets specifically to avoid permission issues listing all bets
      const myBetsData = await getBetsByCambista(userProfile.uid);
      setBets(myBetsData);

      // Load matches for the games view
      const allMatches = await getMatches();
      setMatches(allMatches);
    } catch (err) {
      console.error("Failed to load cambista dashboard", err);
    }
  }

  // Filtered bets for display in the "My Bets" section
  const myBets = bets;

  const handleFindBetByPin = async () => {
    if (!pinSearch.trim()) return;
    if (!userProfile) {
      alert("Você precisa estar logado para recuperar uma aposta.");
      return;
    }

    setIsRecoveringAll(true);
    try {
      const bet = await getBetByPin(pinSearch.trim());
      if (!bet) {
        alert("Aposta com este PIN não foi encontrada.");
        setFoundBet(null);
        setCustomerPendingBets([]);
        return;
      }
      
      setFoundBet(bet);
      
      if (bet.status === "pendente_recuperacao") {
        // Fetch all other pending bets of this customer to accept them together
        const related = await getPendingBetsByCustomer(bet.customerPhone, bet.userId);
        // Ensure our searched bet is in the array, if not already
        const hasIt = related.some(b => b.id === bet.id);
        const finalRelated = hasIt ? related : [...related, bet];
        setCustomerPendingBets(finalRelated);
      } else {
        setCustomerPendingBets([]);
      }
    } catch (error: any) {
      console.error("Error finding bet by PIN", error);
      alert(error.message || "Erro ao buscar aposta por PIN.");
      setFoundBet(null);
      setCustomerPendingBets([]);
    } finally {
      setIsRecoveringAll(false);
    }
  };

  const handleAcceptBet = async (bet: Bet) => {
    if (!userProfile) return;
    if (!bet.pin) {
      alert("Este bilhete não possui um PIN para recuperação.");
      return;
    }
    
    setIsRecoveringAll(true);
    try {
      // Execute the real-time recovery on Firestore
      const recoveredBet = await recoverBetByPinTransaction(bet.pin, userProfile.uid);
      alert("Aposta aceita e vinculada ao seu painel com sucesso!");
      
      // Let's reload cambista dashboard lists so the new bets show up
      await loadCambistaData();
      
      // Now, generate a beautiful complete summary text of all the bets that were played by this client and approved!
      const finalBetsAccepted = customerPendingBets.length > 0 ? customerPendingBets : [bet];
      const count = finalBetsAccepted.length;
      const totalStaked = finalBetsAccepted.reduce((sum, b) => sum + b.stake, 0);
      const totalPayout = finalBetsAccepted.reduce((sum, b) => sum + b.potentialPayout, 0);
      
      let message = `⚽ *PH BET - Aposta(s) Confirmada(s)!* 🔥\n\n`;
      message += `Olá, *${bet.customerName}*! Suas apostas cadastradas no telefone *${bet.customerPhone}* foram *ACEITAS e VALIDADAS* no sistema pelo operador/cambista *${personalProfile?.name || "Cambista PH Bet"}*!\n\n`;
      message += `📋 *RESUMO COMPLETO DAS ENTRADAS (${count} Bilhete${count > 1 ? 's' : ''}):*\n`;
      message += `===================================\n\n`;
      
      finalBetsAccepted.forEach((b, index) => {
        message += `Ticket #${index + 1}: *${b.pin || b.id}*\n`;
        message += `📍 PIN: *${b.pin || "Pendente"}*\n`;
        message += `🔗 Acompanhar Bilhete Online: ${window.location.origin}/?ticket=${b.id}\n`;
        message += `⚽ Confrontos:\n`;
        b.matches.forEach(m => {
          const predictionLabel = m.prediction === "home" ? "Casa" : m.prediction === "draw" ? "Empate" : "Fora";
          message += `• *${m.homeTeam} x ${m.awayTeam}*\n`;
          message += `  Palpite: *${predictionLabel}* | Status: ${m.status || "pendente"}\n`;
        });
        message += `💰 Valor da Aposta: *R$ ${b.stake.toFixed(2)}*\n`;
        message += `🏆 Retorno Potencial: *R$ ${b.potentialPayout.toFixed(2)}*\n`;
        message += `-----------------------------------\n\n`;
      });
      
      message += `📊 *TOTAIS CONSOLIDADOS DO CLIENTE:*\n`;
      message += `• Qte Bilhetes: *${count}*\n`;
      message += `• Valor Total Apostado: *R$ ${totalStaked.toFixed(2)}*\n`;
      message += `• Retorno Total Possível: *R$ ${totalPayout.toFixed(2)}*\n\n`;
      message += `Obrigado por escolher a PH BET! Boa sorte com os seus palpites! 🍀⚽`;
      
      if (bet.customerPhone) {
        // Try linking remaining unassigned ones for safety if any
        await linkAllCustomerBetsToCambista(bet.customerPhone, userProfile.uid);
        
        // Open WhatsApp directly via wa.me
        const phoneFormatted = bet.customerPhone.replace(/\D/g, "");
        const whatsappLink = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, "_blank");
      }
      
      setFoundBet(null);
      setCustomerPendingBets([]);
      setPinSearch("");
    } catch (error: any) {
      console.error("Failed accepting bet", error);
      alert(error.message || "Não foi possível aceitar a aposta.");
    } finally {
      setIsRecoveringAll(false);
    }
  };

  const handleAcceptBetFromRow = async (bet: Bet) => {
    if (!userProfile) {
      alert("Você precisa estar logado para realizar esta ação.");
      return;
    }
    if (!bet.pin) {
      alert("Este bilhete não possui um PIN para recuperação.");
      return;
    }
    
    setIsRecoveringAll(true);
    try {
      // 1. Fetch all other pending bets of this client to summarize them together
      const related = await getPendingBetsByCustomer(bet.customerPhone, bet.userId);
      // Ensure the clicked bet is inside the collection
      const hasIt = related.some(b => b.id === bet.id);
      const finalBetsAccepted = hasIt ? related : [...related, bet];

      // 2. Execute the real-time recovery transaction on Firestore for the selected bet
      const recoveredBet = await recoverBetByPinTransaction(bet.pin, userProfile.uid);
      alert("Aposta aceita e vinculada ao seu painel com sucesso!");
      
      // 3. Reload data
      await loadCambistaData();
      
      // 4. Generate beautiful complete WhatsApp summary
      const count = finalBetsAccepted.length;
      const totalStaked = finalBetsAccepted.reduce((sum, b) => sum + b.stake, 0);
      const totalPayout = finalBetsAccepted.reduce((sum, b) => sum + b.potentialPayout, 0);
      
      let message = `⚽ *PH BET - Aposta(s) Confirmada(s)!* 🔥\n\n`;
      message += `Olá, *${bet.customerName}*! Suas apostas cadastradas no telefone *${bet.customerPhone}* foram *ACEITAS e VALIDADAS* no sistema pelo operador/cambista *${personalProfile?.name || "Cambista PH Bet"}*!\n\n`;
      message += `📋 *RESUMO COMPLETO DAS ENTRADAS (${count} Bilhete${count > 1 ? 's' : ''}):*\n`;
      message += `===================================\n\n`;
      
      finalBetsAccepted.forEach((b, index) => {
        message += `Ticket #${index + 1}: *${b.pin || b.id}*\n`;
        message += `📍 PIN: *${b.pin || "Pendente"}*\n`;
        message += `🔗 Acompanhar Bilhete Online: ${window.location.origin}/?ticket=${b.id}\n`;
        message += `⚽ Confrontos:\n`;
        b.matches.forEach(m => {
          const predictionLabel = m.prediction === "home" ? "Casa" : m.prediction === "draw" ? "Empate" : "Fora";
          message += `• *${m.homeTeam} x ${m.awayTeam}*\n`;
          message += `  Palpite: *${predictionLabel}* | Status: ${m.status || "pendente"}\n`;
        });
        message += `💰 Valor da Aposta: *R$ ${b.stake.toFixed(2)}*\n`;
        message += `🏆 Retorno Potencial: *R$ ${b.potentialPayout.toFixed(2)}*\n`;
        message += `-----------------------------------\n\n`;
      });
      
      message += `📊 *TOTAIS CONSOLIDADOS DO CLIENTE:*\n`;
      message += `• Qte Bilhetes: *${count}*\n`;
      message += `• Valor Total Apostado: *R$ ${totalStaked.toFixed(2)}*\n`;
      message += `• Retorno Total Possível: *R$ ${totalPayout.toFixed(2)}*\n\n`;
      message += `Obrigado por escolher a PH BET! Boa sorte com os seus palpites! 🍀⚽`;
      
      if (bet.customerPhone) {
        await linkAllCustomerBetsToCambista(bet.customerPhone, userProfile.uid);
        const phoneFormatted = bet.customerPhone.replace(/\D/g, "");
        const whatsappLink = `https://wa.me/${phoneFormatted}?text=${encodeURIComponent(message)}`;
        window.open(whatsappLink, "_blank");
      }
    } catch (error: any) {
      console.error("Failed accepting bet from row", error);
      alert(error.message || "Não foi possível aceitar a aposta.");
    } finally {
      setIsRecoveringAll(false);
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelBet = async (bet: Bet) => {
    if (!userProfile) return;
    
    // Admin bypasses 20 min rule, handled via UI or backend rules. 
    // Simply updating status to "cancelled" here.
    const isOwner = bet.cambistaId === userProfile.uid;
    const isAdmin = userProfile.role === "admin";
    
    if (!isOwner && !isAdmin) {
      alert("Você não tem permissão para cancelar este bilhete.");
      return;
    }

    if (isCancelling) return;

    if (!confirm("Tem certeza que deseja cancelar esta aposta? Esta ação não pode ser desfeita.")) return;

    setIsCancelling(true);
    try {
      const cancelledBet: Bet = { ...bet, status: "cancelled", commissionStatus: "cancelled" };
      await updateBet(cancelledBet);
      alert("Bilhete cancelado com sucesso!");
      await loadCambistaData();
    } catch (err: any) {
      console.error("Failed to cancel bet", err);
      alert("Erro ao cancelar o bilhete: " + err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    loadCambistaData();
    // Setup real-time subscribers
    const unsubBets = userProfile ? subscribeToBetsByCambista(userProfile.uid, loadCambistaData) : () => {};
    const unsubUsers = userProfile ? subscribeToUserProfile(userProfile.uid, loadCambistaData) : () => {};

    return () => {
       unsubBets();
       unsubUsers();
    };
  }, [userProfile]);

  // Compute stats
  const commissionRate = personalProfile?.commissionPercentage || 15;

  // Pending Commission: Sum commissionValue from bets with commissionStatus 'pending'
  const pendingCommission = myBets
    .filter(b => b.commissionStatus === "pending")
    .reduce((acc, b) => acc + (b.commissionValue || 0), 0);

  // Validated Commission (historical or current): Sum commissionValue from bets with commissionStatus 'validated'
  const validatedCommission = myBets
    .filter(b => b.commissionStatus === "validated")
    .reduce((acc, b) => acc + (b.commissionValue || 0), 0);

  const totalBetsPlaced = myBets.length;

  const bankLimit = personalProfile?.bankLimit ?? 0;
  const pendingStakes = myBets
    .filter(b => b.status === "pending")
    .reduce((acc, b) => acc + b.stake, 0);
  const availableLimit = Math.max(0, bankLimit - pendingStakes);
  const limitPercentageUsed = bankLimit > 0 ? Math.min(100, (pendingStakes / bankLimit) * 100) : 0;

  const searchNormalized = betSearch.toLowerCase();
  const searchFilteredBets = myBets.filter(b => 
    b.id.toLowerCase().includes(searchNormalized) || 
    b.customerName.toLowerCase().includes(searchNormalized) ||
    (b.commissionToken && b.commissionToken.toLowerCase().includes(searchNormalized))
  );

  if (userProfile?.status === "blocked" || personalProfile?.status === "blocked") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight animate-pulse">Acesso Bloqueado</h2>
          <p className="text-sm text-gray-650 mt-2 leading-relaxed">
            Sua conta de cambista está temporariamente <strong>bloqueada</strong> no sistema pelo administrador da PH BET.
          </p>
          <div className="text-xs text-red-700 bg-red-50 p-4 rounded-2xl font-bold mt-4 border border-red-100 leading-snug">
            Sua banca de intermediações está suspensa. Para restabelecer seu acesso e liberar o resgate de suas comissões acumuladas, por favor entre em contato com o suporte ou equipe administrativa do PH BET.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title banner */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-black text-gray-950 tracking-tighter flex items-center gap-2 justify-center sm:justify-start">
          <BadgePercent className="h-8 w-8 text-[#007BFF]" />
          Painel de Cambista PH <span className="text-[#00AEEF] font-black">BET</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
          Gerenciamento e controle de vendas, comissões em tempo real por token e acompanhamento de faturamento.
        </p>
      </div>

      {/* Dashboard Stats / Faturamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {/* Faturamento de Entradas (Bruto) */}
        <div className="bg-gray-900 text-white p-5 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-5 w-5 text-blue-400" />
            <span className="block text-[10px] text-gray-400 uppercase font-black tracking-wider">Faturamento de Entradas</span>
          </div>
          <span className="block text-2xl font-black leading-tight">
            R$ {myBets.reduce((acc, b) => acc + b.stake, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-[10px] text-blue-400 font-bold mt-1">Total de valores captados</span>
        </div>

        {/* Bilhetes Totais */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/85 shadow-xs flex items-center gap-4">
          <div className="bg-gray-50 p-3 rounded-xl shrink-0">
            <Bookmark className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 uppercase font-black tracking-wider">Total de Apostas</span>
            <span className="block text-2xl font-black text-gray-950 leading-tight">
              {myBets.length}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Bilhetes registrados</span>
          </div>
        </div>

        {/* Lucro em Aberto (Pending) */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/85 shadow-xs flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl shrink-0">
            <Clock className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 uppercase font-black tracking-wider">Comissão a Receber</span>
            <span className="block text-2xl font-black text-amber-600 leading-tight">
              R$ {pendingCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 font-semibold block mt-1">Ganhos em jogos pendentes</span>
          </div>
        </div>

        {/* Lucro Real (Validated) */}
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-4">
          <div className="bg-white p-3 rounded-xl shrink-0 shadow-sm">
            <BadgePercent className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <span className="block text-[10px] text-emerald-600 uppercase font-black tracking-wider">Lucro Líquido Real</span>
            <span className="block text-2xl font-black text-emerald-700 leading-tight">
              R$ {validatedCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-500 font-semibold block mt-1">Total creditado finalizado</span>
          </div>
        </div>

        {/* Limite de Banca */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/85 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 p-3 rounded-xl shrink-0">
              <DollarSign className="h-6 w-6 text-[#007BFF]" />
            </div>
            <div>
              <span className="block text-[10px] text-gray-400 uppercase font-black tracking-wider">Limite de Banca</span>
              <span className="block text-lg font-extrabold text-gray-900 leading-tight">
                {bankLimit > 0 ? `R$ ${bankLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem Limite"}
              </span>
            </div>
          </div>
          {bankLimit > 0 && (
            <div className="pt-2 border-t border-gray-50">
              <div className="flex justify-between text-[9px] text-gray-450 font-bold mb-1">
                <span>Livre: R$ {availableLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                <span>{limitPercentageUsed.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-155 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${limitPercentageUsed > 85 ? "bg-red-500" : limitPercentageUsed > 50 ? "bg-amber-500" : "bg-[#007BFF]"}`} 
                  style={{ width: `${limitPercentageUsed}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Commission Rate */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/85 shadow-xs flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl shrink-0">
            <BadgePercent className="h-6 w-6 text-[#007BFF]" />
          </div>
          <div>
            <span className="block text-[10px] text-gray-400 uppercase font-black tracking-wider">Taxa de Comissão</span>
            <span className="block text-xl font-extrabold text-gray-900 leading-tight">
              {commissionRate}%
            </span>
            <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">Definida pelo Geral</span>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl mb-6 w-fit border border-gray-200">
        <button
          onClick={() => setView("bets")}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            view === "bets" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📄 Meus Bilhetes
        </button>
        <button
          onClick={() => setView("games")}
          className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            view === "games" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ⚽ Todos os Jogos
        </button>
      </div>

      {/* Bets & commissions lists */}
      {view === "bets" ? (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6">
          <div className="flex flex-col gap-4">
             <div>
              <h3 className="text-base font-black text-gray-950 uppercase">Bilhetes Relacionados às Minhas Intermediações</h3>
              <p className="text-xs text-gray-400 font-semibold">Consumo e andamento de suas apostas intermediadas abaixo.</p>
            </div>
            
            {/* PIN SEARCH */}
            <div className="flex gap-2">
              <div className="relative w-full sm:w-64">
                <Key className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Recuperar pelo PIN..."
                  value={pinSearch}
                  onChange={(e) => setPinSearch(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
              <button
                onClick={handleFindBetByPin}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
              >
                Recuperar
              </button>
            </div>
          </div>
          
          {foundBet && (
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 w-full sm:max-w-md shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between mb-3 border-b border-blue-100 pb-2">
                <h4 className="text-sm font-black text-blue-900 uppercase tracking-tighter flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 bg-blue-650 rounded-full animate-ping"></span>
                  Bilhete Localizado
                </h4>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">PIN: {foundBet.pin}</span>
              </div>
              
              <div className="space-y-4">
                {/* Customer name and phone */}
                <div className="bg-white/80 p-3 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase">Apostador Final:</span>
                    <span className="text-xs text-blue-950 font-black">{foundBet.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase">Whatsapp:</span>
                    <span className="text-xs text-blue-950 font-mono font-bold">{foundBet.customerPhone || "Não Informado"}</span>
                  </div>
                </div>

                {/* Show ALL pending bets if there are multiple, otherwise show just this searched bet */}
                <div className="space-y-3">
                  <span className="text-[10px] text-blue-900 font-black uppercase tracking-wider block">
                    {customerPendingBets.length > 1 
                      ? `📋 Resumo das Apostas do Cliente (${customerPendingBets.length} Bilhetes)`
                      : `📋 Resumo da Aposta Localizada`
                    }
                  </span>

                  <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                    {(customerPendingBets.length > 0 ? customerPendingBets : [foundBet]).map((ticket, ticketIdx) => (
                      <div key={ticket.id} className="bg-white p-3 rounded-xl border border-blue-100 shadow-xs relative">
                        <div className="flex justify-between items-center border-b border-gray-50 pb-1.5 mb-2">
                          <span className="text-[9px] font-extrabold text-blue-750 font-mono">#{ticketIdx + 1} - {ticket.id}</span>
                          <span className="text-[9px] font-bold text-gray-400 font-mono">PIN: {ticket.pin || "N/A"}</span>
                        </div>

                        {/* Matches */}
                        <div className="space-y-1.5 mb-2">
                          {ticket.matches.map((m, idx) => {
                            const predLabel = m.prediction === "home" ? "Casa" : m.prediction === "draw" ? "Empate" : "Fora";
                            return (
                              <div key={idx} className="text-[10px] leading-tight text-gray-800 font-bold flex items-center justify-between">
                                <span className="truncate max-w-[200px]">{m.homeTeam} x {m.awayTeam}</span>
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-850 rounded uppercase text-[8px] font-black">{predLabel}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Stats for this ticket */}
                        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded-lg text-[9px] font-bold text-gray-700">
                          <span>Aposta: R$ {ticket.stake.toFixed(2)}</span>
                          <span className="text-emerald-700 font-extrabold">Retorno: R$ {ticket.potentialPayout.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Consolidated stats at bottom */}
                <div className="bg-blue-600 text-white p-3.5 rounded-xl border border-blue-500 shadow-md">
                  <span className="block text-[8px] text-blue-200 font-black uppercase mb-1.5 tracking-widest text-center">Totais Consolidados do Cliente</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-blue-700/30 p-1.5 rounded-lg border border-blue-500/20">
                      <span className="block text-[8px] text-blue-250 font-bold uppercase">Bilhetes</span>
                      <span className="text-xs font-black">{customerPendingBets.length > 0 ? customerPendingBets.length : 1}</span>
                    </div>
                    <div className="bg-blue-700/30 p-1.5 rounded-lg border border-blue-500/20">
                      <span className="block text-[8px] text-blue-250 font-bold uppercase">Apostado</span>
                      <span className="text-xs font-black">
                        R$ {(customerPendingBets.length > 0 ? customerPendingBets.reduce((sum, b) => sum + b.stake, 0) : foundBet.stake).toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-blue-700/30 p-1.5 rounded-lg border border-blue-500/20">
                      <span className="block text-[8px] text-blue-250 font-bold uppercase">Retorno</span>
                      <span className="text-xs font-black font-mono">
                        R$ {(customerPendingBets.length > 0 ? customerPendingBets.reduce((sum, b) => sum + b.potentialPayout, 0) : foundBet.potentialPayout).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Action Buttons */}
                {foundBet.status === "recuperada" || foundBet.accepted ? (
                   <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl text-center text-xs font-black uppercase flex flex-col items-center justify-center gap-1 border border-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4" />
                        Aposta(s) já Validada(s)
                      </div>
                      <span className="text-[9px] text-emerald-750 font-bold normal-case mt-0.5">Operada e aprovada pelo cambista.</span>
                   </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleAcceptBet(foundBet)}
                      className="w-full bg-emerald-600 text-white py-3 rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-2 uppercase tracking-wide border border-emerald-500 cursor-pointer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Aceitar Aposta & Enviar WhatsApp
                    </button>
                  </div>
                )}
                
                <button 
                  onClick={() => {
                    setFoundBet(null);
                    setCustomerPendingBets([]);
                  }}
                  className="w-full text-[10px] text-blue-400 font-bold hover:text-blue-500 transition-colors uppercase tracking-widest pt-1 cursor-pointer"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          )}

          <div className="relative w-full sm:w-64 self-end">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Código do bilhete ou nome..."
              value={betSearch}
              onChange={(e) => setBetSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-gray-600">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="py-2.5 px-3">Código / Horário</th>
                <th className="py-2.5 px-3">Apostador Final</th>
                <th className="py-2.5 px-3">Confrontos e Palpites</th>
                <th className="py-2.5 px-3">Valor Apostado</th>
                <th className="py-2.5 px-3">Status do Jogo</th>
                <th className="py-2.5 px-3">Sua Comissão</th>
                <th className="py-2.5 px-3">Token de Comissão</th>
                <th className="py-2.5 px-3">Status Comissão</th>
                <th className="py-2.5 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {searchFilteredBets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400 font-bold">Nenhum bilhete correspondente aos filtros.</td>
                </tr>
              ) : (
                [...searchFilteredBets].reverse().map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="py-4 px-3">
                      <span className="font-extrabold text-blue-800 block">{b.id}</span>
                      <span className="text-[10px] text-gray-450 block mt-0.5">{new Date(b.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-3">
                      <span className="font-extrabold text-gray-900 block">{b.customerName}</span>
                      <span className="text-[9px] text-gray-400 italic block mt-0.5">{b.customerPhone}</span>
                    </td>
                    <td className="py-4 px-3 max-w-sm">
                      <div className="space-y-1">
                        {b.matches.map((sm) => (
                          <div key={sm.matchId} className="text-[10px] leading-tight flex items-center gap-1.5 font-medium">
                            <span className="text-gray-800">{sm.homeTeam} x {sm.awayTeam}</span>
                            <span className="text-gray-450">({sm.prediction === "home" ? "Casa" : sm.prediction === "draw" ? "Empate" : "Fora"})</span>
                            <span className={`px-1 rounded text-[8px] font-bold ${
                              sm.status === "won" ? "bg-emerald-50 text-emerald-700" : sm.status === "lost" ? "bg-rose-50 text-rose-700" : "bg-gray-100 text-gray-500"
                            }`}>
                              {sm.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 font-bold text-gray-950">R$ {b.stake.toFixed(2)}</td>
                    <td className="py-4 px-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                        b.status === "won" ? "bg-emerald-50 text-emerald-700" : b.status === "lost" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-3 font-extrabold text-emerald-600 text-sm">
                      R$ {b.commissionValue?.toFixed(2)}
                      <span className="block text-[8px] text-gray-400 font-bold mt-0.5">({b.commissionPercentage}%)</span>
                    </td>
                    <td className="py-4 px-3 font-mono font-bold text-blue-700 text-sm tracking-wider">
                      {b.commissionToken || "-"}
                    </td>
                    <td className="py-4 px-3">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase ${
                        b.commissionStatus === "validated" 
                          ? "bg-emerald-100 text-emerald-850" 
                          : b.commissionStatus === "cancelled" 
                            ? "bg-red-50 text-red-700" 
                            : "bg-amber-50 text-amber-700"
                      }`}>
                        {b.commissionStatus === "validated" ? "Validada & Creditada" : b.commissionStatus === "cancelled" ? "Cancelada" : "Pendente"}
                      </span>
                    </td>
                    <td className="py-4 px-3 text-center">
                      {b.status === "pendente_recuperacao" ? (
                        <button
                          onClick={() => handleAcceptBetFromRow(b)}
                          disabled={isRecoveringAll}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] tracking-wide uppercase transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer mx-auto leading-none"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Aceitar Aposta
                        </button>
                      ) : b.status === "pending" ? (
                        <button
                          onClick={() => handleCancelBet(b)}
                          disabled={isCancelling}
                          className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] tracking-wide uppercase transition-colors shadow-sm flex items-center justify-center gap-1 cursor-pointer mx-auto leading-none"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                          {b.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    ) : (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-black text-gray-950 uppercase">Catálogo de Jogos em Tempo Real</h3>
            <p className="text-xs text-gray-400 font-semibold">Consulte as odds e horários para informar seus clientes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.filter(m => m.isActive && m.status === "pending").map(m => (
              <div key={m.id} className="border border-gray-100 rounded-xl p-4 hover:border-blue-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">{m.league}</span>
                  <span className="text-[9px] text-gray-400 font-bold">{new Date(m.date).toLocaleDateString()}</span>
                </div>
                <div className="text-sm font-black text-gray-900 mb-3">
                  {m.homeTeam} <span className="text-gray-300 font-normal mx-1">vs</span> {m.awayTeam}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <span className="block text-[8px] text-gray-400 font-bold uppercase">Casa</span>
                    <span className="text-xs font-black text-blue-700">{m.odds.homeWins.toFixed(2)}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <span className="block text-[8px] text-gray-400 font-bold uppercase">Empate</span>
                    <span className="text-xs font-black text-blue-700">{m.odds.draw.toFixed(2)}</span>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg text-center">
                    <span className="block text-[8px] text-gray-400 font-bold uppercase">Fora</span>
                    <span className="text-xs font-black text-blue-700">{m.odds.awayWins.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
