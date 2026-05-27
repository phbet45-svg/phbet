import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { X, Phone, Lock, Mail, UserPlus, AlertTriangle } from "lucide-react";
import { createUserProfile } from "../lib/dbService";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (isRegister) {
      if (!name || !email || !phone || !password) {
        setErrorMsg("Todos os campos de cadastro são de preenchimento obrigatório.");
        setLoading(false);
        return;
      }
      try {
        const uid = `cli_${Date.now()}`;
        // Registers direct cliente profile with zero balance
        await createUserProfile({
          uid,
          name,
          email,
          phone,
          role: "cliente",
          status: "active",
          commissionPercentage: 0,
          createdAt: new Date().toISOString()
        });
        
        // Let's use the quickLogin or login flow
        const { quickLogin } = await import("../contexts/AuthContext").then(m => m.useAuth());
        await quickLogin(uid);
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || "Erro durante o cadastro.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!email || !password) {
        setErrorMsg("Por favor, preencha email/senha para prosseguir.");
        setLoading(false);
        return;
      }
      try {
        await login(email, password);
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || "Usuário ou senha incorretos.");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full relative overflow-hidden">
        {/* Banner header inside portal */}
        <div className="bg-blue-800 px-6 py-5 text-white flex justify-between items-center">
          <div>
            <span className="text-xl font-black">PH BET</span>
            <span className="block text-[10px] text-blue-200">
              {isRegister ? "Crie sua conta de Apostador" : "Entrar ou selecionar conta"}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs text-red-900 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Celular / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: 11988887777"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 text-gray-950"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Seu email registrado"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 text-gray-950"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 text-gray-950"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black text-sm py-2.5 rounded-lg transition-all shadow-md mt-6 disabled:bg-gray-400"
            >
              {loading 
                ? "Conectando..." 
                : isRegister 
                  ? "Registrar e Entrar" 
                  : "Entrar na Conta"}
            </button>
          </form>

          {/* Switch Mode */}
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMsg("");
              }}
              className="text-xs text-blue-600 font-bold hover:underline"
            >
              {isRegister 
                ? "Já possui uma conta? Acesse agora" 
                : "Não é cadastrado? Crie sua conta de Apostador"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
