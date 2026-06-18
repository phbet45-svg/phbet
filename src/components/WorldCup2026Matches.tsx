import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Team { name: string; crest: string };
interface Match {
  id: number;
  status: string;
  utcDate: string;
  homeTeam: Team;
  awayTeam: Team;
  score: { fullTime: { home: number | null; away: number | null } };
  stage: string;
  venue: string;
}

export const WorldCup2026Matches: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/world-cup-matches');
      if (!response.ok) throw new Error('Falha ao buscar dados');
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (err) {
      setError('Erro ao carregar jogos da Copa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDateTime = (utcDate: string) => {
    return new Date(utcDate).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const criarCard = (match: Match) => (
    <div key={match.id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex items-center justify-between mb-3">
        <div className="flex-1 flex items-center gap-3">
            <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <strong className="text-white text-sm">{match.homeTeam.name}</strong>
        </div>
        <div className="text-center px-4">
            <strong className="text-xl text-white block">
                {match.score.fullTime.home ?? '-'} - {match.score.fullTime.away ?? '-'}
            </strong>
             <small className="text-gray-400 text-xs">{formatDateTime(match.utcDate)}</small>
        </div>
        <div className="flex-1 flex items-center gap-3 justify-end">
            <strong className="text-white text-sm">{match.awayTeam.name}</strong>
            <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
    </div>
  );

  if (loading) return <div className="text-white p-4">Carregando...</div>;
  if (error) return <div className="text-red-500 p-4 flex items-center gap-2"><AlertCircle /> {error}</div>;

  const aoVivo = matches.filter(m => ["IN_PLAY", "LIVE", "PAUSED"].includes(m.status));
  const proximos = matches.filter(m => ["TIMED", "SCHEDULED"].includes(m.status)).sort((a,b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  return (
    <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">⚽ Copa do Mundo 2026</h2>
        <button onClick={fetchMatches} className="text-gray-400 hover:text-white"><RefreshCw size={20} /></button>
      </div>

      {aoVivo.length > 0 && (
        <>
          <h3 className="text-red-500 font-bold mb-3">🔴 AO VIVO ({aoVivo.length})</h3>
          {aoVivo.map(criarCard)}
        </>
      )}

      {proximos.length > 0 && (
        <>
          <h3 className="text-yellow-500 font-bold mb-3 mt-4">📅 Próximos Jogos</h3>
          {proximos.slice(0, 15).map(criarCard)}
        </>
      )}
    </div>
  );
};
