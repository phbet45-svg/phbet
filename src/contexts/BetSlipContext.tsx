import React, { createContext, useContext, useState, useEffect } from "react";
import { SelectedBetMatch, Bet, Match } from "../types";
import { useAuth } from "./AuthContext";
import { placeBet, generateCommissionToken, getUserProfile, getBetsByCambista, getSystemConfig } from "../lib/dbService";

interface BetSlipContextType {
  items: SelectedBetMatch[];
  stake: number;
  totalOdds: number;
  potentialPayout: number;
  customerName: string;
  customerPhone: string;
  selectedCambistaId: string;
  addToSlip: (match: Match, prediction: string) => void;
  removeFromSlip: (matchId: string, prediction?: string) => void;
  clearSlip: () => void;
  setStake: (stake: number) => void;
  setCustomerName: (name: string) => void;
  setCustomerPhone: (phone: string) => void;
  setSelectedCambistaId: (id: string) => void;
  submitBet: () => Promise<{ success: boolean; bet?: Bet; error?: string }>;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

function getMarketGroup(prediction: string) {
  if (["home", "draw", "away"].includes(prediction)) return "winner";
  if (prediction.includes("corners")) return "corners";
  if (prediction.includes("cards")) return "cards";
  return "other";
}

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, isCliente, isCambista } = useAuth();
  const [items, setItems] = useState<SelectedBetMatch[]>([]);
  const [stake, setStake] = useState<number>(10);
  const [betBuilderDiscount, setBetBuilderDiscount] = useState(20);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCambistaId, setSelectedCambistaId] = useState("");

  useEffect(() => {
    async function loadConfig() {
      const config = await getSystemConfig();
      if (config.betBuilderDiscount !== undefined) {
        setBetBuilderDiscount(config.betBuilderDiscount);
      }
    }
    loadConfig();
  }, []);

  const hasWinner = items.some(item => getMarketGroup(item.prediction) === 'winner');
  const hasOthers = items.some(item => ['corners', 'cards'].includes(getMarketGroup(item.prediction)));
  
  const rawTotalOdds = items.reduce((acc, item) => acc * item.odd, 1);
  const totalOdds = parseFloat(
    (hasWinner && hasOthers ? rawTotalOdds * (1 - betBuilderDiscount / 100) : rawTotalOdds).toFixed(2)
  );
  
  // Max payout capped at R$ 10.000,00
  const potentialPayout = parseFloat(Math.min(totalOdds * stake, 10000).toFixed(2));

  // Auto-fill names if the user is a logged-in Cliente
  useEffect(() => {
    if (userProfile && userProfile.role === "cliente") {
      setCustomerName(userProfile.name);
      setCustomerPhone(userProfile.phone || "");
    }
  }, [userProfile]);

  function addToSlip(match: Match, prediction: string) {
    // If match is finished or inactive, block
    if (match.status !== "pending" || !match.isActive) return;

    // Get selected odd value supporting multi-market fallback
    let odd = 1.0;
    if (prediction === "home") odd = match.odds.homeWins;
    else if (prediction === "draw") odd = match.odds.draw;
    else if (prediction === "away") odd = match.odds.awayWins;
    else if (prediction === "over95_corners") odd = match.odds.over95_corners ?? 1.85;
    else if (prediction === "under95_corners") odd = match.odds.under95_corners ?? 1.85;
    else if (prediction === "over105_corners") odd = match.odds.over105_corners ?? 2.10;
    else if (prediction === "under105_corners") odd = match.odds.under105_corners ?? 1.65;
    else if (prediction === "over115_corners") odd = match.odds.over115_corners ?? 2.50;
    else if (prediction === "under115_corners") odd = match.odds.under115_corners ?? 1.45;
    else if (prediction === "over55_cards") odd = match.odds.over55_cards ?? 1.80;
    else if (prediction === "under55_cards") odd = match.odds.under55_cards ?? 1.90;

    setItems((prev) => {
      const marketGroup = getMarketGroup(prediction);
      const existingInSameMarket = prev.find(
        (item) => item.matchId === match.id && getMarketGroup(item.prediction) === marketGroup
      );

      if (existingInSameMarket) {
        // Toggle off if exactly the same
        if (existingInSameMarket.prediction === prediction) {
          return prev.filter((item) => item !== existingInSameMarket);
        }
        // Replace in same market
        return prev.map((item) =>
          item === existingInSameMarket ? { ...item, prediction, odd } : item
        );
      } else {
        // Add new
        return [
          ...prev,
          {
            matchId: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            prediction,
            odd,
            status: "pending",
          },
        ];
      }
    });
  }

  function removeFromSlip(matchId: string, prediction?: string) {
    if (prediction) {
      setItems((prev) => prev.filter((item) => !(item.matchId === matchId && item.prediction === prediction)));
    } else {
      setItems((prev) => prev.filter((item) => item.matchId !== matchId));
    }
  }

  function clearSlip() {
    setItems([]);
    setStake(10);
    setCustomerName(userProfile?.role === "cliente" ? userProfile.name : "");
    setCustomerPhone(userProfile?.role === "cliente" ? userProfile.phone || "" : "");
    setSelectedCambistaId("");
  }

  async function submitBet() {
    if (items.length === 0) {
      return { success: false, error: "Nenhuma partida selecionada no bilhete." };
    }
    if (stake < 5) {
      return { success: false, error: "O valor mínimo permitido para realizar uma aposta é R$ 5,00." };
    }

    // Determine context
    // If client is logged in:
    //  - Deduct client's balance
    //  - If client chose a cambista, we also generate commission for that cambista!
    // If cambista is logged in:
    //  - Register as placed by this cambista
    //  - Commission is generated for this cambista immediately upon placement (pending outcome)
    // If anonymous:
    //  - If they chose a cambista, register cambistaId, generating token!
    
    let resolvedUserId: string | null = null;
    let resolvedCambistaId: string | null = null;
    let commissionPercentage: number | null = null;

    if (currentUser) {
      if (userProfile?.role === "cliente") {
        resolvedUserId = currentUser.uid;
        if (selectedCambistaId) {
          resolvedCambistaId = selectedCambistaId;
        }
      } else if (userProfile?.role === "cambista") {
        resolvedCambistaId = currentUser.uid;
      }
    } else if (selectedCambistaId) {
      // Guest selecting a cambista on physical counter or affiliate
      resolvedCambistaId = selectedCambistaId;
    }

    if (resolvedCambistaId) {
      // Get the cambista percentage to freeze it on creation
      const partner = await getUserProfile(resolvedCambistaId);
      if (partner) {
        commissionPercentage = partner.commissionPercentage;

        // Enforce the bankLimit (limite de banca de dinheiro/jogos) for the cambista
        const limit = partner.bankLimit ?? 0;
        if (limit > 0) {
          const cambistaBets = await getBetsByCambista(resolvedCambistaId, 1000);
          const pendingStakes = cambistaBets
            .filter(b => b.status === "pending" || b.status === "pendente_recuperacao")
            .reduce((acc, b) => acc + b.stake, 0);

          if (pendingStakes + stake > limit) {
            return {
              success: false,
              error: `O limite de banca permitido para o cambista (${partner.name}) é de R$ ${limit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Atualmente há R$ ${pendingStakes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em apostas pendentes, restando R$ ${Math.max(0, limit - pendingStakes).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Esta nova aposta de R$ ${stake.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} excede esse limite.`
            };
          }
        }
      }
    }

    // Default general comission from fallback or standard partner
    if (resolvedCambistaId && commissionPercentage === null) {
      commissionPercentage = 10; // default 10%
    }

    const commissionValue = resolvedCambistaId && commissionPercentage
      ? parseFloat(((stake * commissionPercentage) / 100).toFixed(2))
      : null;

    const commissionToken = resolvedCambistaId ? generateCommissionToken() : null;

    const pinChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const pinLength = Math.floor(Math.random() * 3) + 8; // 8 to 10
    let generatedPin = "";
    for (let i = 0; i < pinLength; i++) {
      generatedPin += pinChars.charAt(Math.floor(Math.random() * pinChars.length));
    }

    const newBet: Bet = {
      id: `bet_${Date.now()}`,
      userId: resolvedUserId,
      customerName: customerName || "Cliente Geral",
      customerPhone: customerPhone || "Não Informado",
      matches: items,
      totalOdd: totalOdds,
      stake,
      potentialPayout,
      status: "pendente_recuperacao",
      cambistaId: resolvedCambistaId,
      commissionPercentage,
      commissionValue,
      commissionToken,
      commissionStatus: resolvedCambistaId ? "pending" : "cancelled", // cancelled means no comission applies
      createdAt: new Date().toISOString(),
      pin: generatedPin,
      accepted: false
    };

    try {
      await placeBet(newBet);
      clearSlip();
      return { success: true, bet: newBet };
    } catch (err: any) {
      console.error("Bet error Placing slip", err);
      return { success: false, error: err.message || "Falha na comunicação com o servidor." };
    }
  }

  return (
    <BetSlipContext.Provider
      value={{
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
        submitBet,
      }}
    >
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error("useBetSlip must be used within a BetSlipProvider");
  }
  return context;
}
