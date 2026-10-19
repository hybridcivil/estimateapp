import React, { useState } from "react";
import {
  Shield,
  User,
  Lock,
  Building2,
  Columns,
  SquareDashedBottom,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  HardHat,
  Compass,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import { useAuth, BOOTSTRAP_ADMIN_EMAIL } from "../context/AuthContext";
import { AppUser } from "../types";

interface LoginRegistrationScreenProps {
  onSuccess: (user: AppUser) => void;
}

export const LoginRegistrationScreen: React.FC<LoginRegistrationScreenProps> = ({
  onSuccess,
}) => {
  const { signInWithGoogle, signInWithDirectEmail, error, clearError } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState("Structural Engineer");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    setIsLoadingGoogle(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        // Auth state listener in AuthContext will update appUser
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to sign in with Google");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleDirectAuth = async (emailOverride?: string, nameOverride?: string) => {
    setLocalError(null);
    clearError();
    const targetEmail = (emailOverride || email).trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes("@")) {
      setLocalError("Please enter a valid Gmail / work email address.");
      return;
    }

    setIsLoadingDirect(true);
    try {
      const targetName = nameOverride || (fullName.trim() ? fullName : undefined);
      const res = await signInWithDirectEmail(targetEmail, targetName);
      if (res.success) {
        // Auth listener in AuthContext or parent will receive user
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to authenticate");
    } finally {
      setIsLoadingDirect(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-[#0a121e] text-[#f1f5f9] select-none overflow-y-auto">
      {/* Background Blueprint Grid Lines */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(to right, #243b55 1px, transparent 1px), linear-gradient(to bottom, #243b55 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="fixed inset-0 bg-radial from-transparent via-[#0a121e]/80 to-[#0a121e] pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 px-4 py-3 sm:px-8 sm:py-4 border-b border-[#2d4a6a]/60 bg-[#0e1726]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl p-1 flex items-center justify-center shadow-lg shadow-[#00c2c7]/10 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
              <rect x="15" y="45" width="22" height="42" rx="3" fill="#152033" />
              <rect x="23" y="53" width="7" height="7" rx="1" fill="#ffffff" />
              <rect x="40" y="25" width="26" height="62" rx="3" fill="#f5a623" />
              <rect x="46" y="32" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="47" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <rect x="46" y="62" width="6" height="10" rx="1" fill="#ffffff" opacity="0.85" />
              <path
                d="M72 32h16m-8 0v20m0 0l-3 4m3-4l3 4"
                stroke="#152033"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <line x1="72" y1="32" x2="72" y2="87" stroke="#152033" strokeWidth="4" />
              <path d="M10 88h80" stroke="#00c2c7" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-white tracking-wider">
                ASHRAF CIVIL STUDIO
              </h1>
              <span className="text-[9px] bg-[#00c2c7]/20 border border-[#00c2c7]/40 text-[#00c2c7] px-1.5 py-0.5 rounded font-mono font-bold">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#8ba3c1] hidden sm:block">
              Civil Engineering Estimation & Multi-Storey BOQ File System
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] bg-[#2ecc71]/15 text-[#2ecc71] px-2 py-0.5 rounded-full border border-[#2ecc71]/30 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ecc71] animate-pulse" />
            Cloud Security Active
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-[#131f33] border border-[#2d4a6a] rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Top Banner inside card */}
          <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-[#182a44] to-[#131f33] border-b border-[#24374e]">
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[#00c2c7]/15 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7] shadow-lg shadow-[#00c2c7]/10">
                <HardHat className="w-6 h-6 stroke-[2]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-center text-white tracking-tight">
              Engineer Access Portal
            </h2>
            <p className="text-xs text-center text-[#8ba3c1] mt-1 max-w-xs mx-auto">
              Every engineer gets their own isolated project workspace stored securely in Firebase Cloud.
            </p>

            {/* Login / Register Toggle Tabs */}
            <div className="mt-4 grid grid-cols-2 bg-[#0e1726] p-1 rounded-xl border border-[#2d4a6a]/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setLocalError(null);
                }}
                className={`py-2 rounded-lg transition text-center cursor-pointer ${
                  tab === "login"
                    ? "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-md"
                    : "text-[#8ba3c1] hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("register");
                  setLocalError(null);
                }}
                className={`py-2 rounded-lg transition text-center cursor-pointer ${
                  tab === "register"
                    ? "bg-[#00c2c7] text-[#0f1c2e] font-bold shadow-md"
                    : "text-[#8ba3c1] hover:text-white"
                }`}
              >
                Register
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Active Error Notice */}
            {activeError && (
              <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold text-red-200">Sign-In Notice</div>
                  <div className="text-[11px] mt-0.5 leading-relaxed">{activeError}</div>
                </div>
              </div>
            )}

            {/* Administrator One-Click VIP Card (Always accessible for engrkalilinux@gmail.com) */}
            <div className="bg-gradient-to-r from-amber-500/20 via-[#1e304b] to-[#16253c] border-2 border-amber-500/50 rounded-2xl p-4 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Master Administrator
                  </span>
                </div>
                <span className="text-[9px] bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/40">
                  Full Control
                </span>
              </div>

              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>engrkalilinux@gmail.com</span>
                </div>
                <p className="text-[11px] text-[#9bb3d1] mt-0.5">
                  Designated system admin: manages all users, controls projects, and audits BOQ estimates.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDirectAuth(BOOTSTRAP_ADMIN_EMAIL, "Engr. Kali (Admin)")}
                disabled={isLoadingDirect}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Shield className="w-4 h-4 stroke-[2.5]" />
                <span>
                  {isLoadingDirect ? "Authorizing Admin Workspace..." : "1-Click Super Admin Sign In"}
                </span>
              </button>
            </div>

            {/* Option 2: Standard Google Popup Auth */}
            <div className="space-y-2 pt-1">
              <div className="text-[10px] font-bold text-[#8ba3c1] uppercase tracking-wider text-center">
                — Or Sign In With Google Popup —
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoadingGoogle}
                className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer border border-slate-300 disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {isLoadingGoogle ? "Opening Google Account..." : "Continue with Google (Gmail)"}
                </span>
              </button>
            </div>

            {/* Option 3: Direct Email & Registration Form */}
            <div className="bg-[#0e1726] border border-[#24374e] rounded-2xl p-4 space-y-3">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#00c2c7]" />
                <span>
                  {tab === "login" ? "Sign In with Engineer Email" : "Register New Engineer Account"}
                </span>
              </div>

              {tab === "register" && (
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Full Name & Title</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Engr. Tanvir Ahmed"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7]"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] text-[#8ba3c1] block mb-1">
                  Gmail / Work Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@gmail.com"
                  className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7]"
                />
              </div>

              {tab === "register" && (
                <div>
                  <label className="text-[10px] text-[#8ba3c1] block mb-1">Specialization</label>
                  <select
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00c2c7]"
                  >
                    <option value="Structural Engineer">Structural Engineer</option>
                    <option value="Civil Estimator">Civil Estimator</option>
                    <option value="Project Director">Project Director</option>
                    <option value="Site Engineer">Site Engineer</option>
                    <option value="Consultant">Civil Consultant</option>
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDirectAuth()}
                disabled={isLoadingDirect || !email.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-bold px-4 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-[#00c2c7]/20"
              >
                <span>
                  {isLoadingDirect
                    ? "Setting Up Workspace..."
                    : tab === "login"
                    ? "Open My Project Workspace"
                    : "Register & Initialize Workspace"}
                </span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>

            {/* Privacy & Project Isolation Guarantee */}
            <div className="bg-[#0b1422] border border-[#1e304b] rounded-xl p-3 text-[11px] text-[#8ba3c1] space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Strict Project Isolation</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                Your estimates and projects are privately linked to your own account and completely invisible to other engineers.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[10px] text-[#8ba3c1] border-t border-[#2d4a6a]/40 bg-[#0a121e]/80">
        Ashraf Civil Studio PRO · BNBC & ACI Structural Estimation System · Google Firebase Cloud
      </footer>
    </div>
  );
};
