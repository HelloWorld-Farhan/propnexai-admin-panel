"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ShieldAlert, Lock, Unlock, Mail, Users } from "lucide-react";
import axios from "axios";

export function DatabaseVaultWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"IDLE" | "PASSWORD" | "OTP" | "UNLOCKED">("IDLE");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/admin/vault/init", { password });
      setOtpToken(res.data.vaultToken);
      setStep("OTP");
      setPassword(""); // Clear password
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
      const res = await axios.post("/api/admin/vault/unlock", { vaultToken: otpToken, answer });
      setUsers(res.data.users || []);
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
    <Card className="border-rose-500/50 relative overflow-hidden col-span-1 lg:col-span-3">
      <CardHeader className="pb-4 border-b border-rose-500/20 bg-rose-500/5">
        <CardTitle className="text-base font-semibold text-rose-500 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          {step === "UNLOCKED" ? "Vault Unlocked" : "Restricted Vault Access"}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setIsOpen(false); setStep("IDLE"); setUsers([]); }}
            className="ml-auto text-muted-foreground hover:text-white"
          >
            Close Vault
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {(step === "IDLE" || step === "PASSWORD") && (
          <div className="p-6 max-w-md mx-auto py-12 text-center">
            <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-lg font-medium mb-2">Master Authentication Required</h3>
            <p className="text-xs text-muted-foreground mb-6">
              You are attempting to access the global user database. Please enter the master password to continue.
            </p>
            
            <form onSubmit={handleInit} className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Master Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background/50 border-rose-500/30 focus-visible:ring-rose-500 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {error && <p className="text-xs text-red-400 text-left">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={!password || loading}>
                {loading ? "Verifying..." : "Verify Identity"}
              </Button>
            </form>
          </div>
        )}

        {step === "OTP" && (
          <div className="p-6 max-w-md mx-auto py-12 text-center">
            <Mail className="w-12 h-12 text-rose-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-lg font-medium mb-2">Security Challenge</h3>
            <p className="text-xs text-muted-foreground mb-6">
              A security challenge has been sent to <strong>support@propnexai.com</strong>. Check the email, solve the challenge, and enter the answer below to unlock the vault.
            </p>
            
            <form onSubmit={handleUnlock} className="space-y-4">
              <Input
                type="text"
                placeholder="Enter Answer (OTP)"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="bg-background/50 border-rose-500/30 focus-visible:ring-rose-500 text-center tracking-widest text-lg"
                disabled={loading}
                autoComplete="off"
              />
              
              {error && <p className="text-xs text-red-400">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={!answer || loading}>
                {loading ? "Unlocking..." : "Unlock Vault"}
              </Button>
            </form>
          </div>
        )}

        {step === "UNLOCKED" && (
          <div className="p-0">
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-4 flex items-center gap-3">
              <Unlock className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-500">Vault Access Granted</p>
                <p className="text-xs text-emerald-500/70">Showing {users.length} global user records. Handled with extreme care.</p>
              </div>
            </div>
            
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Password Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-white">{user.firstName} {user.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.phone || "N/A"}</td>
                      <td className="px-6 py-4">
                        <div className="max-w-[200px] truncate text-xs font-mono text-rose-300/80 bg-rose-500/10 px-2 py-1 rounded">
                          {user.passwordHash}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No users found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
