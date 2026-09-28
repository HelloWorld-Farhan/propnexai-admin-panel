"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ShieldAlert, Lock, Unlock, Mail, Users } from "lucide-react";
import axios from "axios";

import useSWR from "swr";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Database, RefreshCw, Terminal, Activity, FileJson, Server, User, Briefcase, LayoutDashboard } from "lucide-react";

export function DatabaseVaultWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"IDLE" | "PASSWORD" | "OTP" | "UNLOCKED">("IDLE");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showExplorer, setShowExplorer] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({});
  const [decryptingIds, setDecryptingIds] = useState<Record<string, boolean>>({});
  const [countdownTimers, setCountdownTimers] = useState<Record<string, number>>({});

  // Custom fetcher for POST requests
  const fetcher = async (url: string) => {
    const res = await axios.post(url, { vaultToken: otpToken, answer });
    return res.data.data;
  };

  const { data: dbData, mutate, isValidating } = useSWR(
    step === "UNLOCKED" ? "/api/admin/vault/unlock" : null,
    fetcher,
    { refreshInterval: 5000 } // Real-time polling every 5s
  );

  const handleManualRefresh = async () => {
    await mutate();
  };

  const handleDecryptPassword = async (userId: string, hash: string) => {
    if (!hash) return;
    
    setDecryptingIds(prev => ({ ...prev, [userId]: true }));
    try {
      const res = await axios.post("/api/admin/vault/decrypt-hash", { hash });
      setDecryptedPasswords(prev => ({ ...prev, [userId]: res.data.password }));
      setCountdownTimers(prev => ({ ...prev, [userId]: 10 }));
      
      const interval = setInterval(() => {
        setCountdownTimers(prev => {
          const current = prev[userId];
          if (current <= 1) {
            clearInterval(interval);
            setDecryptedPasswords(p => {
              const newP = { ...p };
              delete newP[userId];
              return newP;
            });
            const newTimers = { ...prev };
            delete newTimers[userId];
            return newTimers;
          }
          return { ...prev, [userId]: current - 1 };
        });
      }, 1000);
    } catch (err) {
      setDecryptedPasswords(prev => ({ ...prev, [userId]: "[ERROR]" }));
      setTimeout(() => {
        setDecryptedPasswords(p => {
          const newP = { ...p };
          delete newP[userId];
          return newP;
        });
      }, 3000);
    } finally {
      setDecryptingIds(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/admin/vault/init", { password });
      setOtpToken(res.data.vaultToken);
      setStep("OTP");
      setPassword(""); 
    } catch (err: any) {
      setError(err.response?.data?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await mutate(); // Initial fetch
      setStep("UNLOCKED");
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid answer");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="border-rose-500/20 bg-rose-500/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <ShieldAlert className="w-20 h-20 text-rose-500" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-rose-500 flex items-center gap-2">
            Global Database Vault
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-xs text-muted-foreground mb-3 max-w-[200px]">
                Highly restricted area. Contains sensitive user passwords and details.
              </p>
              <Button 
                onClick={() => setIsOpen(true)} 
                variant="destructive" 
                size="sm"
                className="bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/50"
              >
                <Lock className="w-4 h-4 mr-2" />
                Unlock Vault
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-rose-500/50 relative overflow-hidden bg-background">
        <CardHeader className="pb-4 border-b border-rose-500/20 bg-rose-500/5">
          <CardTitle className="text-base font-semibold text-rose-500 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              {step === "UNLOCKED" ? "Vault Unlocked" : "Restricted Access"}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setIsOpen(false); setStep("IDLE"); }}
              className="w-6 h-6 text-muted-foreground hover:text-white"
            >
              ×
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          {(step === "IDLE" || step === "PASSWORD") && (
            <div className="p-4 text-center">
              <Lock className="w-8 h-8 text-rose-500 mx-auto mb-2 opacity-80" />
              <p className="text-[11px] text-muted-foreground mb-4">
                Enter master password to initialize vault access protocols.
              </p>
              
              <form onSubmit={handleInit} className="space-y-3">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Master Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background/50 h-8 text-xs border-rose-500/30 pr-8"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
                {error && <p className="text-[10px] text-red-400 text-left">{error}</p>}
                <Button type="submit" className="w-full h-8 text-xs bg-rose-600 hover:bg-rose-700" disabled={!password || loading}>
                  {loading ? "Verifying..." : "Verify Identity"}
                </Button>
              </form>
            </div>
          )}

          {step === "OTP" && (
            <div className="p-4 text-center">
              <Mail className="w-8 h-8 text-rose-500 mx-auto mb-2 opacity-80" />
              <p className="text-[10px] text-muted-foreground mb-4">
                Challenge sent to support@propnexai.com. Enter answer to unlock.
              </p>
              
              <form onSubmit={handleUnlock} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="bg-background/50 h-8 text-center text-sm font-mono border-rose-500/30"
                  disabled={loading}
                  autoComplete="off"
                />
                {error && <p className="text-[10px] text-red-400 text-left">{error}</p>}
                <Button type="submit" className="w-full h-8 text-xs bg-rose-600 hover:bg-rose-700" disabled={!answer || loading}>
                  {loading ? "Unlocking..." : "Unlock Vault"}
                </Button>
              </form>
            </div>
          )}

          {step === "UNLOCKED" && (
            <div className="p-4 text-center">
              <Unlock className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="text-xs text-emerald-500/70 mb-4 font-medium">Vault Access Granted</p>
              
              <Button 
                onClick={() => setShowExplorer(true)} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Database className="w-4 h-4 mr-2" />
                Launch Database Explorer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showExplorer} onOpenChange={setShowExplorer}>
        <DialogContent className="max-w-[90vw] w-full h-[90vh] flex flex-col p-0 border-rose-500/30 bg-[#0c0c0e]">
          <DialogHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-rose-500 flex items-center gap-2">
                <Terminal className="w-5 h-5" /> Live Database Explorer
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Raw JSON datastream from all collections. Data syncs in real-time.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleManualRefresh}
                variant="outline"
                size="sm"
                className="h-8 text-xs border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20"
                disabled={isValidating}
              >
                <RefreshCw className={`w-3 h-3 mr-2 ${isValidating ? "animate-spin" : ""}`} />
                {isValidating ? "Syncing..." : "Manual Refresh"}
              </Button>
              {isValidating && (
                <div className="flex items-center gap-2 text-xs text-emerald-500 font-mono bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Live Syncing...
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-white/10 bg-black/40 p-4 space-y-2 overflow-y-auto">
              {[
                { id: "users", label: "Users Table", icon: User },
                { id: "systemEvents", label: "System Events", icon: Activity },
                { id: "infraCosts", label: "Infra Costs", icon: Server },
                { id: "companies", label: "Companies", icon: Briefcase },
                { id: "campaigns", label: "Campaigns", icon: LayoutDashboard },
                { id: "leads", label: "Leads", icon: Database },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-sm transition-all ${
                    activeTab === tab.id 
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {dbData && (
                    <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/70">
                      {dbData[tab.id]?.length || 0}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 bg-[#1e1e1e] overflow-y-auto p-6 font-mono text-[13px] leading-relaxed relative">
              {!dbData ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mr-3" /> Fetching raw database stream...
                </div>
              ) : activeTab === "users" ? (
                <div className="text-emerald-400/90 whitespace-pre-wrap">
                  {"[\n"}
                  {dbData.users.map((user: any, index: number) => (
                    <div key={user.id} className="pl-4">
                      {"  {\n"}
                      {Object.entries(user).map(([key, val], i, arr) => (
                        <div key={key} className="pl-4 flex items-center flex-wrap gap-1">
                          <span className="text-rose-400">"{key}"</span>: 
                          {key === "passwordHash" && val ? (
                            <span className="ml-1 flex items-center gap-2 flex-wrap">
                              <span className="text-amber-300">"{decryptedPasswords[user.id] || String(val)}"</span>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-5 text-[10px] px-2 py-0 border-rose-500/50 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded ml-2"
                                onClick={() => handleDecryptPassword(user.id, String(val))}
                                disabled={decryptingIds[user.id] || !!decryptedPasswords[user.id]}
                              >
                                {decryptingIds[user.id] ? "Decrypting..." : decryptedPasswords[user.id] ? "Decrypted" : "Decrypt Hash"}
                              </Button>
                              {countdownTimers[user.id] !== undefined && (
                                <span className="text-rose-400 text-[10px] ml-2 font-mono">({countdownTimers[user.id]}s)</span>
                              )}
                              {i < arr.length - 1 ? "," : ""}
                            </span>
                          ) : (
                            <span className="ml-1">
                              {val === null ? (
                                <span className="text-blue-300">null</span>
                              ) : typeof val === 'string' ? (
                                <span className="text-amber-300">"{val}"</span>
                              ) : typeof val === 'object' ? (
                                <span className="text-blue-300">{JSON.stringify(val)}</span>
                              ) : (
                                <span className="text-blue-300">{String(val)}</span>
                              )}
                              {i < arr.length - 1 ? "," : ""}
                            </span>
                          )}
                        </div>
                      ))}
                      {"  }"}{index < dbData.users.length - 1 ? ",\n" : "\n"}
                    </div>
                  ))}
                  {"]"}
                </div>
              ) : (
                <pre className="text-emerald-400/90 whitespace-pre-wrap">
                  {JSON.stringify(dbData[activeTab], null, 2)}
                </pre>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
