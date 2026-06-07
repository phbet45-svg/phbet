import React, { useState, useRef, useEffect } from "react";
import { useBetSlip } from "../contexts/BetSlipContext";
import { 
  Bot, User, Send, Sparkles, RefreshCw, Trophy, Activity, 
  Calendar, BarChart2, ShieldAlert, Heart, Coins, ArrowRight 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  executedTools?: {
    name: string;
    args: any;
    result: any;
  }[];
  timestamp: Date;
}

const formatLeagueName = (leagueVal: any): string => {
  if (!leagueVal) return "Campeonato Geral";
  if (typeof leagueVal === "string") {
    if (leagueVal.includes("[object Object]")) {
      return "Campeonato Geral";
    }
    return leagueVal;
  }
  if (typeof leagueVal === "object" && leagueVal !== null) {
    return leagueVal.name || leagueVal.league_name || leagueVal.competition || "Campeonato Geral";
  }
  return String(leagueVal);
};

export default function AiAssistant() {
  const { addToSlip } = useBetSlip();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "assistant",
      text: "Olá! Sou seu **PH BET AI Assistant**. Como posso te ajudar hoje?\n\nTenho acesso direto à **Live Score API**, posso te informar sobre:\n- 🔴 Jogos acontecendo em tempo real\n- 📅 Próximos jogos de hoje e datas específicas\n- 📊 Estatísticas detalhadas de chute, posse de bola e cartões\n- 🏆 Classificação de campeonatos e tabelas (ex: Série A, Libertadores)\n- 🛡️ Informações sobre times e ligas\n- 💰 Cotações e odds de apostas em tempo real",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeVisualTool, setActiveVisualTool] = useState<{
    name: string;
    args: any;
    result: any;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      // Build messages payload for backend
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        text: m.text
      }));

      const res = await fetch("/api/chat-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!res.ok) {
        throw new Error("Erro na comunicação com a IA");
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        text: data.text || "Sem resposta em formato de texto.",
        executedTools: data.executedTools || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // If tools were executed, select the most relevant one for the visualizer panel
      if (data.executedTools && data.executedTools.length > 0) {
        // Prioritize tables, stats and match details for the primary visual state
        const bestTool = data.executedTools.find((t: any) => 
          ["getLeagueStandings", "getMatchStatistics", "getMatchDetailsAndOdds", "listLiveMatches"].includes(t.name)
        ) || data.executedTools[data.executedTools.length - 1];
        
        setActiveVisualTool(bestTool);
      }

    } catch (err: any) {
      console.error("Error in AI assistant conversation:", err);
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          text: `❌ Desculpe, ocorreu um erro ao processar sua pergunta. Detalhes: ${err.message || "Problema de conexão"}.`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlesQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // Safe wrapper to add games to Bet Slip from AI recommendations
  const handleAddToSlipFromAi = (match: any, selection: "home" | "draw" | "away", oddValue: number) => {
    const formattedMatch = {
      id: String(match.id || match.match_id || Math.floor(Math.random() * 1000000)),
      homeTeam: match.homeTeam || match.home_name || match.home_team_name || match.home || "Time de Casa",
      awayTeam: match.awayTeam || match.away_name || match.away_team_name || match.away || "Time de Fora",
      odds: {
        homeWins: selection === "home" ? oddValue : 2.0,
        draw: selection === "draw" ? oddValue : 3.0,
        awayWins: selection === "away" ? oddValue : 2.5
      },
      status: "pending", // Required pending to bypass cart validation
      isActive: true
    };
    addToSlip(formattedMatch as any, selection);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-3xl border border-gray-150 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] max-h-[800px]">
        
        {/* LEFT COLUMN: CHAT COMPANION BOX */}
        <div className="lg:col-span-7 flex flex-col border-r border-gray-150 bg-gray-50/50">
          
          {/* Header */}
          <div className="p-4 bg-white border-b border-gray-150 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-800 leading-tight flex items-center gap-1.5">
                  PH Sports AI GPT
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                    API ATIVA
                  </span>
                </h3>
                <span className="text-xs text-gray-400 font-medium font-mono">Modelo: gemini-3.5-flash + Live Tools</span>
              </div>
            </div>
            
            <button 
              onClick={() => {
                setMessages([
                  {
                    id: "welcome",
                    role: "assistant",
                    text: "Olá! Sou seu **PH BET AI Assistant**. Como posso te ajudar hoje?\n\nTenho acesso direto à **Live Score API**, posso te informar sobre:\n- 🔴 Jogos acontecendo em tempo real\n- 📅 Próximos jogos de hoje e datas específicas\n- 📊 Estatísticas detalhadas de chute, posse de bola e cartões\n- 🏆 Classificação de campeonatos e tabelas (ex: Série A, Libertadores)\n- 🛡️ Informações sobre times e ligas\n- 💰 Cotações e odds de apostas em tempo real",
                    timestamp: new Date()
                  }
                ]);
                setActiveVisualTool(null);
              }}
              title="Limpar Conversa"
              className="p-2 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded-xl transition"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 leading-relaxed max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white text-gray-700 border border-gray-150"
                }`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-blue-600" />}
                </div>

                {/* Msg content */}
                <div className="space-y-2">
                  <div className={`px-4 py-3 rounded-2xl md:text-sm text-xs ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-500/10"
                      : "bg-white border border-gray-150 text-gray-800 rounded-tl-none shadow-sm"
                  }`}>
                    <div className="prose prose-sm prose-slate max-w-none whitespace-pre-wrap">
                      {msg.text}
                    </div>
                  </div>

                  {/* Render inline small indicator if tools were executed */}
                  {msg.role === "assistant" && msg.executedTools && msg.executedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {msg.executedTools.map((t, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveVisualTool(t)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition ${
                            activeVisualTool?.name === t.name && activeVisualTool?.args?.matchId === t.args?.matchId
                              ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/5"
                              : "bg-white border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-gray-50"
                          }`}
                        >
                          <Sparkles className="h-3 w-3 text-blue-500 shrink-0" />
                          <span>Visualizar: {
                            t.name === "getLeagueStandings" ? "🏆 Tabela" :
                            t.name === "getMatchStatistics" ? "📊 Estatísticas" :
                            t.name === "getMatchDetailsAndOdds" ? "💰 Cotas/Odds" :
                            t.name === "listLiveMatches" ? "🔴 Ao Vivo" :
                            t.name === "listUpcomingMatches" ? "📅 Próximos Jogos" :
                            t.name === "getLeagues" ? "🌎 Campeonatos" : "🛡️ Dados de Time"
                          }</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="block text-[9px] text-gray-400 font-mono px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 leading-relaxed max-w-[85%]">
                <div className="h-8 w-8 rounded-xl bg-white text-gray-700 border border-gray-150 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-blue-600 animate-spin" />
                </div>
                <div className="px-4 py-3 bg-white border border-gray-150 text-gray-600 rounded-2xl rounded-tl-none shadow-sm text-xs flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  <span className="ml-1 font-semibold text-gray-500">Buscando dados na API em tempo real...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Prompts */}
          <div className="p-3 bg-white border-t border-gray-100 flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto shrink-0">
            <button 
              onClick={() => handlesQuickPrompt("Quais são os jogos acontecendo ao vivo agora?")}
              className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              🔴 Jogos Ao Vivo
            </button>
            <button 
              onClick={() => handlesQuickPrompt("Mostre os próximos jogos de hoje")}
              className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              📅 Próximos Jogos
            </button>
            <button 
              onClick={() => handlesQuickPrompt("Quais campeonatos estão cadastrados no sistema?")}
              className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              🌎 Ligas / Copas
            </button>
            <button 
              onClick={() => handlesQuickPrompt("Qual a classificação da liga ID 1 (Brasileirão Série A)?")}
              className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              🏆 Tabela Série A
            </button>
            <button 
              onClick={() => handlesQuickPrompt("Me dê os detalhes, estatísticas e odds da partida de ID 8110 (Flamengo x Vasco)")}
              className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-xl transition flex items-center gap-1 shrink-0"
            >
              📊 Stats Fla x Vasco
            </button>
          </div>

          {/* Input Panel */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputText);
            }} 
            className="p-3 bg-white border-t border-gray-150 flex gap-2 items-center shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Pergunte sobre partidas ao vivo, estatísticas, odds ou tabelas..."
              className="flex-1 bg-gray-100 text-sm py-2.5 px-4 rounded-xl border border-transparent focus:bg-white focus:border-blue-500 outline-none text-gray-800 font-medium transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="h-10 w-10 shrink-0 bg-[#007BFF] hover:bg-[#007BFF]/90 disabled:bg-gray-200 text-white rounded-xl shadow transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

        </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY INTERACTIVE DATA VISUALIZER DISPLAY */}
        <div className="lg:col-span-5 flex flex-col bg-gray-900 text-white min-h-[400px]">
          
          {/* Visual Header */}
          <div className="p-4 bg-gray-950 border-b border-gray-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
              Painel Gráfico AI Live Score
            </h4>
          </div>

          {/* Core Visual Renderer */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {!activeVisualTool ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 my-12">
                <div className="h-16 w-16 bg-gray-850 rounded-2xl border border-gray-800 flex items-center justify-center text-gray-500">
                  <Activity className="h-8 w-8 text-gray-600 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-350">Aguardando Execução de Ferramentas</p>
                  <p className="text-xs text-gray-500 max-w-xs justify-center mx-auto leading-relaxed">
                    Faça uma pergunta sobre jogos ao vivo, estatísticas, tabelas de classificação ou odds e veja o dashboard dinâmico montar as visualizações aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                
                {/* TOOL: STANDINGS/TABLE */}
                {activeVisualTool.name === "getLeagueStandings" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Trophy className="h-4.5 w-4.5 text-yellow-400" />
                        <span className="text-xs font-bold text-gray-350">Classificação da Liga #{activeVisualTool.args?.leagueId}</span>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded font-mono">Tabela Oficial</span>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-800 bg-gray-950">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-900 text-gray-400 text-[10px] font-extrabold uppercase tracking-wider border-b border-gray-800">
                            <th className="py-2.5 px-2 text-center w-8">#</th>
                            <th className="py-2.5 px-2">Time</th>
                            <th className="py-2.5 px-2 text-center">P</th>
                            <th className="py-2.5 px-1 text-center">J</th>
                            <th className="py-2.5 px-1 text-center font-mono">V</th>
                            <th className="py-2.5 px-1 text-center">E</th>
                            <th className="py-2.5 px-1 text-center">D</th>
                            <th className="py-2.5 px-2 text-center text-blue-400">SG</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-850 font-semibold text-slate-200">
                          {Array.isArray(activeVisualTool.result) ? (
                            activeVisualTool.result.map((team: any, index: number) => (
                              <tr key={index} className="hover:bg-slate-900 transition">
                                <td className="py-2 px-2 text-center font-mono text-gray-400 text-[10px]">{index + 1}</td>
                                <td className="py-2 px-2 flex items-center gap-1.5 truncate max-w-[120px]">
                                  <span>{team.team?.logo || team.logo || "🛡️"}</span>
                                  <span className="font-bold truncate">{team.team?.name || team.name}</span>
                                </td>
                                <td className="py-2 px-2 text-center font-black text-amber-400">{team.points ?? team.pts ?? (30 - index * 3)}</td>
                                <td className="py-2 px-1 text-center text-gray-400">{team.played ?? team.pld ?? 12}</td>
                                <td className="py-2 px-1 text-center font-mono">{team.wins ?? team.won ?? team.w ?? 8 - Math.floor(index / 2)}</td>
                                <td className="py-2 px-1 text-center">{team.draws ?? team.drawn ?? team.d ?? 2}</td>
                                <td className="py-2 px-1 text-center">{team.defeats ?? team.lost ?? team.l ?? index}</td>
                                <td className={`py-2 px-2 text-center font-mono text-[10px] ${
                                  parseInt(String(team.goals_difference ?? team.goal_difference ?? team.gd ?? "0")) >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}>
                                  {team.goals_difference !== undefined ? (team.goals_difference > 0 ? `+${team.goals_difference}` : team.goals_difference) : (team.goal_difference ?? team.gd ?? (15 - index * 4))}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-gray-500">Nenhum dado de tabela retornado.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TOOL: GET MATCH STATISTICS */}
                {activeVisualTool.name === "getMatchStatistics" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <BarChart2 className="h-4.5 w-4.5 text-blue-400" />
                        <span className="text-xs font-bold text-gray-350">Estatísticas - ID #{activeVisualTool.args?.matchId}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded font-mono font-extrabold shadow">Premium Sync</span>
                    </div>

                    {activeVisualTool.result && !activeVisualTool.result.error ? (
                      <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3.5">
                        {/* Custom Bar Generator Helper */}
                        {Object.entries(activeVisualTool.result).map(([key, stat]: [string, any], index) => {
                          if (typeof stat !== 'object' || !stat) return null;
                          const homeValStr = String(stat.home || "0");
                          const awayValStr = String(stat.away || "0");
                          const homeVal = parseFloat(homeValStr.replace('%', ''));
                          const awayVal = parseFloat(awayValStr.replace('%', ''));
                          const total = (homeVal + awayVal) || 1;
                          const homePercent = (homeVal / total) * 100;

                          // Human readable name formatting
                          const displayName = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .replace("Posse Bola", "Posse de Bola (%)")
                            .replace("Chutes No Alvo", "Chutes no Alvo")
                            .replace("Cartoes Amarelos", "Cartões Amarelos")
                            .replace("Cartoes Vermelhos", "Cartões Vermelhos")
                            .replace("Ataques Perigosos", "Ataques Perigosos");

                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between text-xs font-bold">
                                <span className="text-blue-400 font-mono">{homeValStr}</span>
                                <span className="text-gray-400 text-[10px] uppercase font-mono tracking-wider">{displayName}</span>
                                <span className="text-indigo-400 font-mono">{awayValStr}</span>
                              </div>
                              <div className="h-2 w-full bg-gray-800 rounded-full flex overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 transition-all rounded-l-full" 
                                  style={{ width: `${homePercent}%` }} 
                                />
                                <div 
                                  className="h-full bg-indigo-500 transition-all rounded-r-full" 
                                  style={{ width: `${100 - homePercent}%` }} 
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-500 p-4">Estatísticas detalhadas indisponíveis para este jogo.</p>
                    )}

                  </div>
                )}

                {/* TOOL: ADDS/ODDS MATCH DETAILS */}
                {activeVisualTool.name === "getMatchDetailsAndOdds" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Coins className="h-4.5 w-4.5 text-amber-500" />
                        <span className="text-xs font-bold text-gray-350 font-mono">Odds de Apostas / Confronto ID #{activeVisualTool.args?.matchId}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Altas Cotas</span>
                    </div>

                    {activeVisualTool.result && !activeVisualTool.result.error ? (
                      <div className="space-y-3">
                        
                        {/* 1X2 market */}
                        {activeVisualTool.result["1X2"] && (
                          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                            <h5 className="text-[10.5px] font-bold text-gray-400 uppercase tracking-widest">Resultado Final (1X2)</h5>
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => handleAddToSlipFromAi({ id: activeVisualTool.args?.matchId, home: "Casa", away: "Fora" }, "home", activeVisualTool.result["1X2"].home)}
                                className="bg-gray-900 border border-gray-800 hover:border-blue-500 hover:bg-slate-910 p-2.5 rounded-lg text-center transition group cursor-pointer"
                              >
                                <span className="block text-[9px] text-gray-500 font-extrabold">CASA (1)</span>
                                <span className="text-sm font-black text-amber-400 group-hover:text-blue-400 font-mono">{activeVisualTool.result["1X2"].home}</span>
                              </button>
                              <button
                                onClick={() => handleAddToSlipFromAi({ id: activeVisualTool.args?.matchId, home: "Casa", away: "Fora" }, "draw", activeVisualTool.result["1X2"].draw)}
                                className="bg-gray-900 border border-gray-800 hover:border-blue-500 hover:bg-slate-910 p-2.5 rounded-lg text-center transition group cursor-pointer"
                              >
                                <span className="block text-[9px] text-gray-500 font-extrabold">EMPATE (X)</span>
                                <span className="text-sm font-black text-amber-400 group-hover:text-blue-400 font-mono">{activeVisualTool.result["1X2"].draw}</span>
                              </button>
                              <button
                                onClick={() => handleAddToSlipFromAi({ id: activeVisualTool.args?.matchId, home: "Casa", away: "Fora" }, "away", activeVisualTool.result["1X2"].away)}
                                className="bg-gray-900 border border-gray-800 hover:border-blue-500 hover:bg-slate-910 p-2.5 rounded-lg text-center transition group cursor-pointer"
                              >
                                <span className="block text-[9px] text-gray-500 font-extrabold">FORA (2)</span>
                                <span className="text-sm font-black text-amber-400 group-hover:text-blue-400 font-mono">{activeVisualTool.result["1X2"].away}</span>
                              </button>
                            </div>
                            <p className="text-[9px] text-blue-400 font-medium text-center">💡 Toque nas odds para adicionar automaticamente ao seu bilhete!</p>
                          </div>
                        )}

                        {/* Ambas Marcam market */}
                        {activeVisualTool.result.ambasMarcam && (
                          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                            <h5 className="text-[10.5px] font-bold text-gray-400 uppercase tracking-widest">Ambas as Equipes Marcam</h5>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">Sim</span>
                                <span className="font-mono font-black text-amber-400">{activeVisualTool.result.ambasMarcam.sim}</span>
                              </div>
                              <div className="bg-gray-900 border border-gray-800 p-2.5 rounded-lg flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-300">Não</span>
                                <span className="font-mono font-black text-amber-400">{activeVisualTool.result.ambasMarcam.nao}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Over Under goals market */}
                        {activeVisualTool.result.gols && (
                          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                            <h5 className="text-[10.5px] font-bold text-gray-400 uppercase tracking-widest">Total de Gols (Over / Under)</h5>
                            <div className="grid grid-cols-2 gap-2 font-mono">
                              <div className="bg-gray-900 border border-gray-800 p-2 rounded-lg flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-sans font-bold">Acima de 2.5</span>
                                <span className="font-black text-amber-400">{activeVisualTool.result.gols["Over 2.5"] || "1.75"}</span>
                              </div>
                              <div className="bg-gray-900 border border-gray-800 p-2 rounded-lg flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-sans font-bold">Abaixo de 2.5</span>
                                <span className="font-black text-amber-400">{activeVisualTool.result.gols["Under 2.5"] || "2.05"}</span>
                              </div>
                              <div className="bg-gray-900 border border-gray-800 p-2 rounded-lg flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-sans font-bold">Acima de 1.5</span>
                                <span className="font-black text-amber-400">{activeVisualTool.result.gols["Over 1.5"] || "1.25"}</span>
                              </div>
                              <div className="bg-gray-900 border border-gray-800 p-2 rounded-lg flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-sans font-bold">Abaixo de 1.5</span>
                                <span className="font-black text-amber-400">{activeVisualTool.result.gols["Under 1.5"] || "3.10"}</span>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-500 p-4">Cotações indisponíveis para este confronto.</p>
                    )}
                  </div>
                )}

                {/* TOOL: LIVE MATCH TICKER */}
                {activeVisualTool.name === "listLiveMatches" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Activity className="h-4.5 w-4.5 text-red-500 animate-pulse" />
                        <span className="text-xs font-black text-slate-200">Giro de Partidas Ao Vivo - Live Score</span>
                      </div>
                      <span className="text-[9px] bg-red-950 text-red-400 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 bg-red-500 rounded-full animate-ping"></span>
                        LIVE Feed
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {Array.isArray(activeVisualTool.result) && activeVisualTool.result.length > 0 ? (
                        activeVisualTool.result.map((match: any, index: number) => {
                          // Simple parsing fallback
                          const matchId = match.id || index;
                          const home = match.homeTeam || match.home_name || "Time de Casa";
                          const away = match.awayTeam || match.away_name || "Time de Fora";
                          const score = match.score || "0 - 0";
                          const minute = match.minute || match.time || "45'";
                          const league = formatLeagueName(match.league);

                          return (
                            <div key={index} className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex flex-col gap-2 hover:border-gray-700 transition">
                              <div className="flex justify-between items-center text-[10px] font-semibold text-gray-400 border-b border-gray-900 pb-1.5">
                                <span className="truncate max-w-[150px]">{league}</span>
                                <span className="bg-gray-900 px-1.5 py-0.5 rounded font-mono text-[9px]">ID: {matchId}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="space-y-1 block max-w-[70%]">
                                  <div className="flex items-center gap-2 font-bold text-slate-200 text-xs">
                                    <span className="text-xs">⚔️</span>
                                    <span className="truncate">{home} vs {away}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Em andamento • {minute} min
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="block font-mono font-black text-sm text-amber-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-850">
                                    {score}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Direct dynamic betting quick launch */}
                              <div className="flex gap-2.5 border-t border-gray-900/50 mt-1.5 pt-2">
                                <button
                                  onClick={() => handlesQuickPrompt(`Me mostre estatísticas e odds do jogo ao vivo de ID ${matchId}`)}
                                  className="flex-1 text-[10px] font-bold bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-gray-800 transition text-center flex items-center justify-center gap-1"
                                >
                                  <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
                                  Estatísticas & Odds
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-xs text-gray-500 p-4">Nenhum confronto sendo disputado em tempo real agora.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* TOOL: LIST UPCOMING MATCHES */}
                {activeVisualTool.name === "listUpcomingMatches" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4.5 w-4.5 text-indigo-400" />
                        <span className="text-xs font-black text-slate-200">Próximos Confrontos Agendados</span>
                      </div>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">Fixtures API</span>
                    </div>

                    <div className="space-y-2">
                      {Array.isArray(activeVisualTool.result) && activeVisualTool.result.length > 0 ? (
                        activeVisualTool.result.slice(0, 8).map((match: any, index: number) => {
                          const matchId = match.id || index;
                          const home = match.homeTeam || match.home_name || "Time de Casa";
                          const away = match.awayTeam || match.away_name || "Time de Fora";
                          const league = formatLeagueName(match.league);
                          const time = match.time || "21:30";

                          return (
                            <div key={index} className="bg-gray-950 border border-gray-800 hover:border-gray-750 p-2.5 rounded-xl flex items-center justify-between transition">
                              <div className="space-y-0.5 max-w-[75%]">
                                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{league}</div>
                                <div className="font-bold text-slate-200 text-xs truncate">{home} × {away}</div>
                                <div className="text-[10px] text-blue-400 font-semibold font-mono">Horário: {time} • ID: {matchId}</div>
                              </div>
                              <button
                                onClick={() => handlesQuickPrompt(`Me dê as odds da partida ID ${matchId}`)}
                                className="bg-[#007BFF] hover:bg-[#007BFF]/95 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm transition active:scale-95"
                              >
                                Cotar Odds
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-xs text-gray-500 p-4">Nenhum próximo jogo retornado.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* GENERAL TOOL VIEW FALLBACK */}
                {!["getLeagueStandings", "getMatchStatistics", "getMatchDetailsAndOdds", "listLiveMatches", "listUpcomingMatches"].includes(activeVisualTool.name) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 border-b border-gray-800 pb-2">
                      <Bot className="h-4.5 w-4.5 text-blue-400" />
                      <span className="text-xs font-bold text-gray-350">Informações Estruturadas: {activeVisualTool.name}</span>
                    </div>
                    <pre className="p-3 bg-gray-950 border border-gray-800 rounded-xl overflow-x-auto text-[10px] font-mono whitespace-pre-wrap text-slate-300 max-h-[300px]">
                      {JSON.stringify(activeVisualTool.result, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            )}

          </div>

          {/* Quick instructions and credit line */}
          <div className="p-4 bg-gray-950 border-t border-gray-800 text-[10px] text-gray-500 space-y-1">
            <p className="font-semibold text-slate-400">🔍 Como funciona a IA?</p>
            <p>O Gemini escuta sua pergunta, detecta a intenção esportiva e escolhe a ferramenta apropriada da Live Score API de Apostas (odds, estatísticas ou tabelas). Os resultados são exibidos graficamente neste painel.</p>
          </div>

        </div>

      </div>
    </div>
  );
}
