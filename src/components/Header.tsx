import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Coins, User, LogOut, ShieldAlert, BadgePercent, Landmark, Activity, Sparkles } from "lucide-react";

interface HeaderProps {
  onOpenLogin: () => void;
  currentTab: string;
  onChangeTab: (tab: string) => void;
}

export default function Header({ onOpenLogin, currentTab, onChangeTab }: HeaderProps) {
  const { userProfile, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm text-[#1F1F1F] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => onChangeTab("sports")}>
          <img 
            src="https://i.postimg.cc/k4Wszn56/Chat-GPT-Image-26-de-mai-de-2026-13-03-24.png" 
            alt="PH BET" 
            className="h-12 w-auto"
          />
          <span className="text-2xl font-black tracking-tighter">
            <span className="text-blue-600">PH</span>
            <span className="text-[#1F1F1F]">BET</span>
          </span>
        </div>

        {/* Dynamic Context Tabs */}
        <nav className="flex items-center gap-1 bg-gray-100 p-1.5 rounded-full border border-gray-200 shadow-inner">
          <button
            onClick={() => onChangeTab("sports")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              currentTab === "sports"
                ? "bg-[#007BFF] text-white shadow-sm"
                : "text-gray-600 hover:text-[#007BFF] hover:bg-white"
            }`}
          >
            <span className="text-red-500 animate-pulse text-xs leading-none">🔴</span>
            <span>Esportes AO VIVO</span>
          </button>

          {userProfile?.role === "admin" && (
            <button
              onClick={() => onChangeTab("admin")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === "admin"
                  ? "bg-[#007BFF] text-white shadow-sm"
                  : "text-gray-600 hover:text-[#007BFF] hover:bg-white"
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Painel Admin
            </button>
          )}

          {userProfile?.role === "cambista" && (
            <button
              onClick={() => onChangeTab("cambista")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentTab === "cambista"
                  ? "bg-[#007BFF] text-white shadow-sm"
                  : "text-gray-600 hover:text-[#007BFF] hover:bg-white"
              }`}
            >
              <BadgePercent className="h-3.5 w-3.5" />
              Meu Painel
            </button>
          )}
        </nav>

        {/* User Stats & Session Button */}
        <div className="flex items-center gap-4">
          {userProfile ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="block text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">
                  {userProfile.role === "admin" ? "Dono da Banca" : userProfile.role}
                </span>
                <span className="block text-sm font-black text-gray-800 leading-tight">
                  {userProfile.name.split(" ")[0]}
                </span>
              </div>

              <button
                onClick={logout}
                title="Sair do PH BET"
                className="p-2 border border-gray-250 hover:bg-rose-50 rounded-xl hover:border-red-400 text-gray-500 hover:text-red-500 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="bg-[#007BFF] hover:bg-[#007BFF]/95 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <User className="h-3.5 w-3.5" />
              Entrar na Conta
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
