import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { BetSlipProvider } from "./contexts/BetSlipContext";
import Header from "./components/Header";
import PublicBetting from "./components/PublicBetting";
import AdminPanel from "./components/AdminPanel";
import CambistaPanel from "./components/CambistaPanel";
import LoginModal from "./components/LoginModal";
import Intro from "./components/Intro";
import TicketTracker from "./components/TicketTracker";
import { Coins, Flame, Info, CheckCircle, ShieldAlert } from "lucide-react";

function AppContent() {
  const { userProfile } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>("sports");
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  
  // Real-time direct ticket URL tracking interception
  const [trackingId, setTrackingId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tracking") || params.get("ticket") || params.get("id") || params.get("acompanhar");
  });

  // Track popstate changes (back/forward in browser) and periodically check URL parameters
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const tid = params.get("tracking") || params.get("ticket") || params.get("id") || params.get("acompanhar");
      setTrackingId(tid);
    };
    window.addEventListener("popstate", handleUrlChange);
    const interval = setInterval(handleUrlChange, 600);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
      clearInterval(interval);
    };
  }, []);

  const handleClearTrackingUrl = () => {
    window.history.pushState({}, "", window.location.pathname);
    setTrackingId(null);
  };

  // Requirement: Detect user type and redirect automatically to correct dashboard ONLY upon login/logout transition
  const [lastUid, setLastUid] = useState<string | null>(null);

  useEffect(() => {
    const currentUid = userProfile?.uid || null;
    if (currentUid !== lastUid) {
      setLastUid(currentUid);
      if (userProfile) {
        if (userProfile.role === "admin") {
          setCurrentTab("admin");
        } else if (userProfile.role === "cambista") {
          setCurrentTab("cambista");
        } else {
          setCurrentTab("sports");
        }
      } else {
        // Direct visitors to sports page
        setCurrentTab("sports");
      }
    }
  }, [userProfile, lastUid]);

  // Bypass and show the Ticket Tracker directly (identical to reference image)
  if (trackingId) {
    return (
      <div className="min-h-screen bg-[#182232] text-white flex flex-col font-sans">
        <main className="flex-1">
          <TicketTracker ticketId={trackingId} onBack={handleClearTrackingUrl} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F1F1F] flex flex-col font-sans">
      {showIntro && <Intro onComplete={() => setShowIntro(false)} />}
      
      {/* Dynamic Navigation Header */}
      <Header 
        onOpenLogin={() => setIsLoginOpen(true)} 
        currentTab={currentTab}
        onChangeTab={(tab) => setCurrentTab(tab)}
      />

      {/* Main Container with dynamic tab loading */}
      <main className="flex-1 pb-16">
        {currentTab === "sports" && <PublicBetting />}
        {currentTab === "admin" && <AdminPanel />}
        {currentTab === "cambista" && <CambistaPanel />}
      </main>

      {/* Global Interactive Portal Login Modal */}
      {isLoginOpen && <LoginModal onClose={() => setIsLoginOpen(false)} />}

      {/* Styled Footer */}
      <footer className="bg-gray-900 text-gray-400 border-t border-gray-800 text-xs py-10">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex justify-center flex-wrap gap-6 text-sm font-bold text-gray-300">
            <span className="hover:text-blue-500 cursor-pointer" onClick={() => setCurrentTab("sports")}>Apostas</span>
            {userProfile?.role === "admin" && (
              <span className="hover:text-blue-500 cursor-pointer text-blue-400" onClick={() => setCurrentTab("admin")}>Admin</span>
            )}
            <span className="hover:text-blue-500 cursor-pointer">Regras Gerais</span>
            <span className="hover:text-blue-500 cursor-pointer">Suporte</span>
          </div>
          <div>
            <p className="font-extrabold text-blue-500 tracking-wider">PH BET SPORTSBOOK ENGINE</p>
            <p className="mt-1 font-medium">© 2026 PH BET S.A. Todos os direitos reservados. Licenciado para operação em tempo real.</p>
          </div>
          <div className="bg-gray-950 max-w-xl mx-auto p-3.5 rounded-lg border border-gray-800 text-[10px] space-y-1 text-gray-500 text-left">
            <div className="flex items-start gap-1.5 leading-relaxed">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
              <span>
                <strong>Atenção Desenvolvedor:</strong> Este sistema PH BET possui sincronização nativa com Firestore Security Rules de alta segurança para prevenção de fraudes e vazamento de dados. As comissões de cambistas estão vinculadas a transações unificadas e registradas em tempo real com hashing determinístico de tokens.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BetSlipProvider>
        <AppContent />
      </BetSlipProvider>
    </AuthProvider>
  );
}
