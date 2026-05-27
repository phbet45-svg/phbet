import React, { useState, useEffect, useRef } from "react";
import { getBetById, getMatches, getUserProfile } from "../lib/dbService";
import { Bet, Match, SelectedBetMatch, translatePrediction } from "../types";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Volume2, 
  VolumeX, 
  Info, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  MessageSquare, 
  Mail, 
  Printer,
  ChevronDown
} from "lucide-react";

interface TicketTrackerProps {
  ticketId: string;
  onBack: () => void;
}

export default function TicketTracker({ ticketId, onBack }: TicketTrackerProps) {
  const [bet, setBet] = useState<Bet | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [cambistaName, setCambistaName] = useState<string>("Sede Oficial");
  const [loading, setLoading] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>("Compacto escuro"); // 'Compacto escuro' | 'Compacto claro' | 'Compacto azul'
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [imageGenerating, setImageGenerating] = useState<boolean>(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play interaction beep
  const playBeep = (freq = 600, duration = 0.1) => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log("Audio not allowed yet or failed", e);
    }
  };

  useEffect(() => {
    async function loadTicketData() {
      setLoading(true);
      try {
        const fetchedBet = await getBetById(ticketId);
        if (fetchedBet) {
          setBet(fetchedBet);
          
          // Fetch match details to get leagues and dates
          const allMatches = await getMatches();
          setMatches(allMatches);

          // Get cambista name if exists
          if (fetchedBet.cambistaId) {
            const profile = await getUserProfile(fetchedBet.cambistaId);
            if (profile) {
              setCambistaName(profile.name);
            }
          }
          
          // Play entry beep
          setTimeout(() => playBeep(880, 0.15), 300);
        }
      } catch (err) {
        console.error("Error loading ticket tracker", err);
      } finally {
        setLoading(false);
      }
    }
    loadTicketData();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#182232] text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-sm font-bold text-gray-400">Carregando bilhete...</p>
      </div>
    );
  }

  if (!bet) {
    return (
      <div className="min-h-screen bg-[#182232] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-sm">
          <h2 className="text-xl font-bold text-red-500 mb-2">Bilhete não encontrado</h2>
          <p className="text-xs text-gray-400 mb-6">
            O identificador do bilhete <span className="font-mono text-white bg-slate-800 px-1 py-0.5 rounded">{ticketId}</span> está incorreto, deletado ou não está disponível para visualização pública no momento.
          </p>
          <button 
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 w-full bg-[#007BFF] hover:bg-blue-600 transition-all font-bold text-xs py-3 rounded-xl cursor-pointer shadow-md"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o Lobby
          </button>
        </div>
      </div>
    );
  }

  // Find info helper
  const getMatchDetails = (matchId: string): Partial<Match> => {
    const match = matches.find(m => m.id === matchId);
    return match || {};
  };

  // Group selections by competition
  const selectionsByLeague: Record<string, SelectedBetMatch[]> = {};
  bet.matches.forEach(m => {
    const matchDetails = getMatchDetails(m.matchId);
    const leagueName = matchDetails.league || "CAMPEONATO GERAL";
    if (!selectionsByLeague[leagueName]) {
      selectionsByLeague[leagueName] = [];
    }
    selectionsByLeague[leagueName].push(m);
  });

  // Calculate formatted dates
  const formatDateString = (isoString?: string) => {
    if (!isoString) return "N/A";
    try {
      const d = new Date(isoString);
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoString;
    }
  };

  const formattedBetDate = formatDateString(bet.createdAt);

  // Generate share links
  const trackingUrl = window.location.href;
  const whatsappShareText = `📋 *Acompanhar Bilhete Online - PH BET* ⚽\n\nCódigo: *${bet.pin || bet.id.substring(4, 10).toUpperCase()}*\nCliente: *${bet.customerName}*\nValor: *R$ ${bet.stake.toFixed(2)}*\n\nClique no link abaixo para acompanhar os resultados em tempo real:\n👉 ${trackingUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareText)}`;
  const mailToUrl = `mailto:?subject=Bilhete PH BET - ${bet.pin || bet.id}&body=${encodeURIComponent("Veja meu bilhete de apostas na PH BET: " + trackingUrl)}`;
  const smsUrl = `sms:?body=${encodeURIComponent("Acompanhe meu palpite na PH BET: " + trackingUrl)}`;

  // Print handle
  const handlePrint = () => {
    playBeep(700, 0.08);
    window.print();
  };

  // True High-Resolution Canvas Export (Downloads a gorgeous PNG receipt)
  const handleDownloadImage = () => {
    playBeep(900, 0.12);
    setImageGenerating(true);
    
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setImageGenerating(false);
        return;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setImageGenerating(false);
        return;
      }

      // 1. Establish high precision dimension
      const width = 800;
      let height = 650 + (bet.matches.length * 160);
      
      canvas.width = width;
      canvas.height = height;

      // Draw background based on theme
      if (theme === "Compacto claro") {
        ctx.fillStyle = "#ffffff";
      } else if (theme === "Clássico azul" || theme === "Compacto azul") {
        ctx.fillStyle = "#0f172a";
      } else {
        ctx.fillStyle = "#111827"; // Dark Escuro
      }
      ctx.fillRect(0, 0, width, height);

      // Header Banner color block
      if (theme === "Compacto claro") {
        ctx.fillStyle = "#f3f4f6";
      } else if (theme === "Clássico azul" || theme === "Compacto azul") {
        ctx.fillStyle = "#1e293b";
      } else {
        ctx.fillStyle = "#182232";
      }
      ctx.fillRect(0, 0, width, 140);

      // 2. Logo drawing
      // Rounded Blue Box Logo Emblem
      ctx.fillStyle = "#2563eb";
      ctx.beginPath();
      ctx.arc(width / 2, 50, 30, 0, Math.PI * 2);
      ctx.fill();

      // Bold text inside logo circle
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("PH", width / 2, 58);

      // Main Brand text with secondary contrast
      ctx.fillStyle = theme === "Compacto claro" ? "#1e293b" : "#ffffff";
      ctx.font = "extrabold 32px sans-serif";
      ctx.fillText("PH BET", width / 2, 110);

      // Inner stats card separator line
      ctx.strokeStyle = theme === "Compacto claro" ? "#e5e7eb" : "#334155";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(width - 40, 140);
      ctx.stroke();

      // Colum grid variables
      const col1 = 60;
      const col2 = 300;
      const col3 = 540;
      
      // Let's write the grid stats
      const drawStat = (label: string, value: string, x: number, y: number) => {
        ctx.textAlign = "left";
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(label.toUpperCase(), x, y);
        
        ctx.fillStyle = theme === "Compacto claro" ? "#1e293b" : "#ffffff";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText(value, x, y + 25);
      };

      let currentY = 180;
      drawStat("Código", bet.pin || bet.id.substring(4, 11).toUpperCase(), col1, currentY);
      drawStat("Colaborador", cambistaName, col2, currentY);
      drawStat("Cliente", bet.customerName, col3, currentY);

      currentY += 65;
      drawStat("Data", formattedBetDate, col1, currentY);
      drawStat("Tipo", bet.accepted ? "Aposta Confirmada" : "Aposta Agendada", col2, currentY);
      drawStat("Situação", bet.status === "pending" || bet.status === "pendente_recuperacao" ? "Aberto" : bet.status === "won" ? "Ganha" : "Perdida", col3, currentY);

      currentY += 65;
      drawStat("Valor", `R$ ${bet.stake.toFixed(2)}`, col1, currentY);
      drawStat("Possível Retorno", `R$ ${bet.potentialPayout.toFixed(2)}`, col2, currentY);
      drawStat("Cambista Paga", "R$ 0.00", col3, currentY);

      currentY += 60;
      // Divider line
      ctx.strokeStyle = theme === "Compacto claro" ? "#e5e7eb" : "#334155";
      ctx.beginPath();
      ctx.moveTo(40, currentY);
      ctx.lineTo(width - 40, currentY);
      ctx.stroke();

      currentY += 35;
      // Section header "CONFRONTOS SELECIONADOS"
      ctx.textAlign = "left";
      ctx.fillStyle = "#3b82f6";
      ctx.font = "extrabold 18px sans-serif";
      ctx.fillText("⚽ CONFRONTOS SELECIONADOS", 45, currentY);

      currentY += 25;

      // Draw all selections
      bet.matches.forEach((m, idx) => {
        const matchDetails = getMatchDetails(m.matchId);
        const leagueName = matchDetails.league || "CAMPEONATO ESPECÍFICO";
        const dateStr = matchDetails.date ? formatDateString(matchDetails.date) : "27/05/2026 19:00";

        // Draw selection subcard Background
        if (theme === "Compacto claro") {
          ctx.fillStyle = "#f9fafb";
          ctx.strokeStyle = "#e5e7eb";
        } else {
          ctx.fillStyle = "#1e293b";
          ctx.strokeStyle = "#334155";
        }
        ctx.beginPath();
        ctx.roundRect(45, currentY, width - 90, 130, 12);
        ctx.fill();
        ctx.stroke();

        // League Label Title
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(leagueName.toUpperCase(), 65, currentY + 30);

        // Date and hours
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(dateStr, 65, currentY + 60);

        // Confrontation / Teams names
        ctx.fillStyle = theme === "Compacto claro" ? "#1e293b" : "#ffffff";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(`${m.homeTeam} x ${m.awayTeam}`, 65, currentY + 85);

        // Golden selection box outline
        ctx.fillStyle = theme === "Compacto claro" ? "#fef3c7" : "#1e1b4b";
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(380, currentY + 40, 340, 50, 8);
        ctx.fill();
        ctx.stroke();

        // Label prediction and odd
        ctx.fillStyle = theme === "Compacto claro" ? "#92400e" : "#fef08a";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(`Palpite: ${translatePrediction(m.prediction)}`, 395, currentY + 70);

        ctx.textAlign = "right";
        ctx.fillStyle = "#fbbf24";
        ctx.font = "extrabold 18px sans-serif";
        ctx.fillText(m.odd.toFixed(2), 700, currentY + 71);

        // reset aligning
        ctx.textAlign = "left";

        currentY += 145;
      });

      // Footer brand details
      currentY += 10;
      ctx.textAlign = "center";
      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText("Obrigado por escolher a PH BET! Siga seus palpites online.", width / 2, currentY);
      
      ctx.fillStyle = "#3b82f6";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(`Bilhete verificado em tempo real: ${trackingUrl}`, width / 2, currentY + 22);

      // Trigger actual computer downloading
      const dataUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `PH_BET_Bilhete_${bet.pin || bet.id}.png`;
      downloadLink.click();
      
      setImageGenerating(false);
    }, 1200);
  };

  // Toggle theme styling mapping
  const getThemeClasses = () => {
    switch (theme) {
      case "Compacto claro":
        return {
          wrapper: "bg-[#F3F4F6] text-[#1F1F1F]",
          card: "bg-white border border-gray-200 text-[#1F1F1F] shadow-md",
          highlightGrid: "bg-gray-100 text-[#1F1F1F]",
          badgeAberto: "bg-amber-100 border border-amber-200 text-amber-800",
          matchRow: "bg-white border border-gray-100 text-[#1F1F1F] hover:bg-gray-50",
          marketContainer: "border border-amber-300 bg-amber-500/10 text-[#1F1F1F]",
          oddText: "text-amber-600 font-extrabold",
          alertBanner: "bg-[#E0F2FE] text-[#0369A1] border border-blue-100",
          statLabel: "text-gray-500",
          statValue: "text-gray-900 font-black",
          pillTitle: "text-gray-900",
          qrText: "text-gray-700"
        };
      case "Clássico azul":
      case "Compacto azul":
        return {
          wrapper: "bg-slate-900 text-white",
          card: "bg-slate-950/80 border border-slate-800 text-white shadow-xl",
          highlightGrid: "bg-slate-900 text-white",
          badgeAberto: "bg-amber-500 text-slate-950 font-black",
          matchRow: "bg-slate-900 border border-slate-800/85 text-white hover:bg-slate-850",
          marketContainer: "border border-[#F59E0B] bg-amber-500/10 text-white",
          oddText: "text-[#F59E0B] font-extrabold",
          alertBanner: "bg-[#0284C7]/20 text-[#38BDF8] border border-sky-950/50",
          statLabel: "text-slate-400",
          statValue: "text-white font-black",
          pillTitle: "text-white",
          qrText: "text-slate-300"
        };
      default: // Compacto escuro
        return {
          wrapper: "bg-[#182232] text-white",
          card: "bg-[#1e293b] border border-slate-800 text-white shadow-xl",
          highlightGrid: "bg-[#182232] text-white",
          badgeAberto: "bg-slate-800 text-white font-black border border-slate-700",
          matchRow: "bg-[#1e293b]/50 border border-slate-800/80 text-white hover:bg-slate-800/40",
          marketContainer: "border border-[#F59E0B] bg-amber-500/10 text-white",
          oddText: "text-[#F59E0B] font-black",
          alertBanner: "bg-[#0EA5E9]/15 text-[#38BDF8] border border-cyan-900/30",
          statLabel: "text-slate-400",
          statValue: "text-slate-100 font-extrabold",
          pillTitle: "text-white",
          qrText: "text-slate-400"
        };
    }
  };

  const styleSet = getThemeClasses();

  return (
    <div className={`min-h-screen ${styleSet.wrapper} font-sans transition-all duration-300 pb-20 px-3 md:px-6 py-4`}>
      
      {/* Invisible Canvas backing for high-res PNG downloads */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Back to sports lobby header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-4 mt-1">
        <button 
          onClick={() => { playBeep(523, 0.08); onBack(); }}
          className="flex items-center gap-1.5 text-xs font-black uppercase text-gray-400 hover:text-white transition-all bg-slate-800/40 hover:bg-slate-800 py-1.5 px-3.5 rounded-full"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar Lobby
        </button>

        <div className="flex items-center gap-2">
          {theme === "Compacto claro" ? (
            <span className="text-[10px] font-bold text-gray-500">Tema Claro Ativo</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400">Tema Escuro Ativo</span>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-4">
        
        {/* BIG BRAND COUPO PORTAL CARD */}
        <div id="print-ticket" className={`rounded-3xl p-5 md:p-6 transition-all duration-300 ${styleSet.card}`}>
          
          {/* LOGO DESIGN SEGMENT (Identical to betsmania.net) */}
          <div className="flex flex-col items-center justify-center text-center mt-2 mb-6">
            
            {/* EMBLEM ICON */}
            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-lg relative transform hover:scale-105 transition-all">
              {/* Outer stylish white circle */}
              <div className="absolute inset-1.5 rounded-[18px] border-2 border-white/40 border-dashed"></div>
              {/* Giant elegant single customized 'B' */}
              <span className="text-3xl font-black text-white italic tracking-wide select-none">B</span>
            </div>

            {/* MAIN METALLIC-STYLE GLOW TITLE */}
            <div className="mt-3">
              <h1 className="text-3xl font-extrabold tracking-tighter text-[#00AEEF]">
                PH <span className="text-[#39B54A]">BET</span>
              </h1>
              <p className="text-[8px] uppercase tracking-widest font-bold text-[#F59E0B]">
                SISTEMA PROFISSIONAL DE BILHETES
              </p>
            </div>
          </div>

          {/* 3x3 COLUMN HIGHLIGHT STATISTICS GRID (Exactly matches image columns) */}
          <div className={`grid grid-cols-3 gap-y-4 gap-x-2 text-center p-4 rounded-2xl mb-5 ${styleSet.highlightGrid}`}>
            
            {/* Col 1, Row 1: CÓDIGO */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Código</span>
              <span className={`text-[13px] font-mono tracking-wider truncate uppercase ${styleSet.statValue}`}>
                {bet.pin || bet.id.substring(4, 11).toUpperCase()}
              </span>
            </div>

            {/* Col 2, Row 1: COLABORADOR */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Colaborador</span>
              <span className={`text-[13px] truncate ${styleSet.statValue}`}>
                {bet.cambistaId ? cambistaName : "Internet"}
              </span>
            </div>

            {/* Col 3, Row 1: CLIENTE */}
            <div className="flex flex-col overflow-hidden">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Cliente</span>
              <span className={`text-[13px] font-bold truncate ${styleSet.statValue}`}>
                {bet.customerName}
              </span>
            </div>

            {/* Col 1, Row 2: DATA */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Data</span>
              <span className={`text-xs ${styleSet.statValue}`}>
                {formattedBetDate.split(" ")[0]}
                <span className="block text-[10px] opacity-75">{formattedBetDate.split(" ")[1]}</span>
              </span>
            </div>

            {/* Col 2, Row 2: TIPO */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Tipo</span>
              <span className={`text-[11px] font-bold ${styleSet.statValue}`}>
                {bet.accepted ? "Aposta confirmada" : "Aposta agendada"}
              </span>
            </div>

            {/* Col 3, Row 2: SITUAÇÃO */}
            <div className="flex flex-col overflow-hidden items-center justify-center">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Situação</span>
              <span className="text-[11px] font-extrabold uppercase">
                {bet.status === "pending" || bet.status === "pendente_recuperacao" ? (
                  <span className="text-[#F59E0B] tracking-wider">Aberto</span>
                ) : bet.status === "won" ? (
                  <span className="text-emerald-500 tracking-wider">Ganha</span>
                ) : bet.status === "lost" ? (
                  <span className="text-red-500 tracking-wider">Perdida</span>
                ) : (
                  <span className="text-gray-400 italic">Cancelado</span>
                )}
              </span>
            </div>

            {/* Col 1, Row 3: VALOR */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Valor</span>
              <span className={`text-[13px] font-extrabold text-[#F59E0B] ${styleSet.statValue}`}>
                R$ {bet.stake.toFixed(2)}
              </span>
            </div>

            {/* Col 2, Row 3: POSSÍVEL RETORNO */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Possível retorno</span>
              <span className="text-[13px] font-extrabold text-emerald-500">
                R$ {bet.potentialPayout.toFixed(2)}
              </span>
            </div>

            {/* Col 3, Row 3: CAMBISTA PAGA */}
            <div className="flex flex-col">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${styleSet.statLabel}`}>Cambista paga</span>
              <span className={`text-[13px] font-extrabold ${styleSet.statValue}`}>
                R$ 0.00
              </span>
            </div>

          </div>

          {/* TWO PRIMARY CONVERT ACTION BUTTONS - PERFECT ALIGNMENT */}
          <div className="grid grid-cols-2 gap-3.5 mb-5 select-none print:hidden">
            <button 
              id="ticket-tracker-baixar-pdf"
              onClick={handlePrint}
              style={{ contentVisibility: "auto" }}
              className="bg-[#EA4335] hover:bg-red-600 active:scale-95 transition-all text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-950/25"
            >
              <Printer className="h-4 w-4" /> Baixar PDF
            </button>
            <button 
              id="ticket-tracker-baixar-img"
              disabled={imageGenerating}
              onClick={handleDownloadImage}
              style={{ contentVisibility: "auto" }}
              className="bg-[#007BFF] hover:bg-blue-600 disabled:bg-gray-700 disabled:cursor-not-allowed active:scale-95 transition-all text-white font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-950/25"
            >
              <Download className="h-4 w-4" /> {imageGenerating ? "Aguarde..." : "Baixar Imagem"}
            </button>
          </div>

          {/* INTEGRATED ACTION SUBZONE WITH LIVE QR AND SYSTEM SETTINGS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-black/10 print:hidden mb-4 border border-white/[0.04]">
            
            {/* QR CODE CONTAINER DISPLAY */}
            <div className="flex flex-col items-center justify-center p-1 bg-white rounded-xl shadow-inner max-w-[170px] mx-auto w-full">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingUrl)}`}
                alt="QR Code Ticket Tracking"
                referrerPolicy="no-referrer"
                className="w-32 h-32"
              />
            </div>

            {/* INTERACTIVE SHARING OPTIONS & INTERFACE THEME & AUDIO CONTROL */}
            <div className="flex flex-col justify-between space-y-3">
              
              {/* Dynamic Share Buttons */}
              <div className="flex items-center justify-center md:justify-start gap-2 pt-1 md:pt-0">
                <a 
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => playBeep(650, 0.08)}
                  className="w-10 h-10 rounded-xl bg-[#25D366] hover:scale-105 active:scale-90 transition-all flex items-center justify-center text-white"
                >
                  <MessageSquare className="h-5 w-5" />
                </a>
                <a 
                  href={mailToUrl}
                  onClick={() => playBeep(650, 0.08)}
                  className="w-10 h-10 rounded-xl bg-[#EA4335] hover:scale-105 active:scale-90 transition-all flex items-center justify-center text-white"
                >
                  <Mail className="h-5 w-5" />
                </a>
                <a 
                  href={smsUrl}
                  onClick={() => playBeep(650, 0.08)}
                  className="w-10 h-10 rounded-xl bg-[#00AEEF] hover:scale-105 active:scale-90 transition-all flex items-center justify-center text-white"
                >
                  <Share2 className="h-5 w-5" />
                </a>
              </div>

              {/* Theme Settings Area */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 block uppercase">Tema do Painel</label>
                <div className="relative">
                  <select 
                    id="ticket-tracker-theme-selector"
                    value={theme}
                    onChange={(e) => {
                      setTheme(e.target.value);
                      setTimeout(() => playBeep(800, 0.05), 100);
                    }}
                    className="w-full bg-slate-900/60 text-xs font-bold py-2.5 pl-3.5 pr-8 rounded-xl border border-slate-700/80 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Compacto escuro">Compacto escuro</option>
                    <option value="Compacto claro">Compacto claro</option>
                    <option value="Clássico azul">Clássico azul</option>
                  </select>
                  <ChevronDown className="h-4 w-4 absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Speaker Interactive Area */}
              <button
                id="ticket-tracker-audio-toggle"
                onClick={() => {
                  const mutedState = !isMuted;
                  setIsMuted(mutedState);
                  if (!mutedState) {
                    setTimeout(() => playBeep(1000, 0.1), 100);
                  }
                }}
                className={`py-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all text-xs font-black ${
                  isMuted 
                    ? "bg-slate-700 hover:bg-slate-650 text-white" 
                    : "bg-[#EA4335]/15 border border-[#EA4335]/30 hover:bg-[#EA4335]/25 text-[#EA4335]"
                }`}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="h-4 w-4" /> Ligar som
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4" /> Desligar som
                  </>
                )}
              </button>

            </div>

          </div>

          {/* SKY-BLUE CALLOUT BANNER FOR CUSTOMER PATIENCE */}
          <div className={`p-4 rounded-2xl flex items-start gap-3 mb-6 leading-normal text-xs font-bold ${styleSet.alertBanner}`}>
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Aguarde, significa que o resultado do jogo está sendo confirmado.</span>
          </div>

          {/* DYNAMIC LIST OF PLAYED GAMES/CONFRONTOS */}
          <div className="space-y-4">
            
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-400 mb-2 px-1">
              Confrontos Escolhidos ({bet.matches.length})
            </h3>

            {Object.keys(selectionsByLeague).map((leagueName) => (
              <div key={leagueName} className="space-y-2.5">
                
                {/* League header segment */}
                <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5 pt-1 px-1">
                  <div className="flex items-center gap-1.5">
                    {/* Circle badge for cup design */}
                    <div className="w-4 h-4 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]"></div>
                    </div>
                    <span className="text-xs font-extrabold uppercase text-slate-350 tracking-wider">
                      {leagueName}
                    </span>
                  </div>
                  <TrendingUp className="h-3.5 w-3.5 text-[#fbbf24] shrink-0" />
                </div>

                {/* Match selections loop */}
                {selectionsByLeague[leagueName].map((m: SelectedBetMatch) => {
                  const matchDetails = getMatchDetails(m.matchId);
                  const dateStr = matchDetails.date ? formatDateString(matchDetails.date) : "27/05/2026 19:00";
                  const dateParts = dateStr.split(" ");
                  const day = dateParts[0];
                  const hours = dateParts[1] || "";

                  // Generate custom random but stable shield colors for teams
                  const getInitialShieldColor = (teamName: string) => {
                    const colors = [
                      "bg-blue-600 text-white", 
                      "bg-red-600 text-white", 
                      "bg-emerald-600 text-white", 
                      "bg-purple-600 text-white",
                      "bg-amber-600 text-slate-900",
                      "bg-cyan-600 text-white"
                    ];
                    const index = Math.abs(teamName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)) % colors.length;
                    return colors[index];
                  };

                  return (
                    <div key={`${m.matchId}_${m.prediction}`} className={`p-4 rounded-2xl transition-all duration-300 ${styleSet.matchRow}`}>
                      
                      {/* Flex grid of game layout */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        
                        {/* Time columns (Day/Hour stacked) */}
                        <div className="md:col-span-3 flex md:flex-col items-center justify-between md:justify-center text-left py-1 px-0.5 border-b md:border-b-0 md:border-r border-white/5 pr-2.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                            <Calendar className="h-3.5 w-3.5 text-blue-500 md:hidden" />
                            {day}
                          </span>
                          <span className="text-[13px] font-black font-mono tracking-tight text-blue-400 mt-0.5 shrink-0">
                            {hours}
                          </span>
                        </div>

                        {/* Middle Confrontation text with beautiful shield badges */}
                        <div className="md:col-span-9 flex flex-col space-y-2 py-0.5 select-none">
                          
                          {/* Home team */}
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${getInitialShieldColor(m.homeTeam)}`}>
                              {m.homeTeam.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-black tracking-tight">{m.homeTeam}</span>
                          </div>

                          {/* Away team */}
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${getInitialShieldColor(m.awayTeam)}`}>
                              {m.awayTeam.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold tracking-tight text-slate-300">{m.awayTeam}</span>
                          </div>

                        </div>

                      </div>

                      {/* Golden border Highlighted prediction selection block */}
                      <div className={`mt-3 p-3 rounded-xl flex items-center justify-between select-none ${styleSet.marketContainer}`}>
                        <div className="text-left">
                          <span className="text-[9px] uppercase tracking-wider block opacity-70">Opção de Palpite</span>
                          <span className="text-[11px] font-black">{translatePrediction(m.prediction)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider block opacity-70">Odd Cotação</span>
                          <span className={styleSet.oddText}>{m.odd.toFixed(2)}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
}
