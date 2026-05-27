import React, { useState } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { saveMatch, getLeagues, saveLeague } from "../lib/dbService";
import { Match } from "../types";

// Helper to compress and convert image to a small base64 JPEG to respect Firestore size limits
function compressAndConvertImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const max_width = 320; // Keep width very small for optimal Firestore size
        const scale = max_width / img.width;
        canvas.width = max_width;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Output compressed jpeg as a lightweight base64 string (50% quality)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

export default function AdminGameUpload({ onRefresh }: { onRefresh: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async () => {
    if (!file && !imageUrl) return;
    setLoading(true);
    setSuccess(false);

    try {
      let matches = [];

      if (file) {
        // Compress and convert file to Base64
        const base64DataUrl = await compressAndConvertImage(file);

        // Send base64 to our server
        const res = await fetch("/api/parse-games-base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64: base64DataUrl }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Non-JSON Server Error Response:", text);
          throw new Error(`Upload falhou: Resposta inesperada do servidor (Status ${res.status}). Detalhes no console.`);
        }

        if (!res.ok) {
          throw new Error(data.error || "Erro ao processar imagem");
        }
        matches = data.matches;
      } else if (imageUrl) {
        // Handle URL Upload
        const res = await fetch("/api/parse-games-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: imageUrl }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error("Non-JSON Server Error Response:", text);
          throw new Error(`Upload falhou: Resposta inesperada do servidor (Status ${res.status}).`);
        }

        if (!res.ok) {
          throw new Error(data.error || "Erro ao processar URL");
        }
        matches = data.matches;
      }
      
      const allLeagues = await getLeagues();
      
      for (const m of matches) {
        const matchId = `match_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        let leagueId = allLeagues.find(l => l.name === m.league)?.id;
        if (!leagueId) {
            leagueId = `league_${m.league.toLowerCase().replace(/[\s\W]+/g, '_')}`;
            const newLeague = { id: leagueId, name: m.league, isActive: true };
            await saveLeague(newLeague);
            allLeagues.push(newLeague);
        }

        const newMatch: Match = {
          id: matchId,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          date: new Date().toISOString().split("T")[0],
          league: m.league,
          isActive: true,
          odds: m.odds,
          status: "pending",
          result: null,
          imageUrl: imageUrl || undefined, 
          createdAt: new Date().toISOString()
        };
        await saveMatch(newMatch);
      }

      setSuccess(true);
      onRefresh();
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Erro: ${err.message}. ${err.details ? JSON.stringify(err.details) : ""}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
      <h3 className="text-base font-black text-gray-900 uppercase">Upload de Jogos (Foto / URL)</h3>
      
      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Arquivo Local</label>
        <input 
          id="games-image-upload"
          type="file" 
          accept="image/*" 
          onChange={(e) => { setFile(e.target.files?.[0] || null); setImageUrl(""); }}
          className="block text-xs"
        />
      </div>

      <div className="text-center font-bold text-gray-400 text-xs py-1">OU</div>

      <div>
        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">URL da Imagem</label>
        <input 
          type="text"
          value={imageUrl}
          placeholder="https://..."
          onChange={(e) => { setImageUrl(e.target.value); setFile(null); }}
          className="w-full text-xs p-2 rounded-lg border border-gray-200"
        />
      </div>

      <button
        id="process-image-btn"
        onClick={handleUpload}
        disabled={(!file && !imageUrl) || loading}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:bg-gray-400 cursor-pointer"
      >
        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
        Processar Imagem
      </button>
      {success && <p className="text-emerald-600 text-xs mt-2 flex items-center gap-1"><Check className="w-4 h-4" /> Jogos importados!</p>}
    </div>
  );
}
