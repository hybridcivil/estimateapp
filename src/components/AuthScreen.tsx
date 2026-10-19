import React, { useState } from "react";
import {
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  HardHat,
  Building2,
  Columns,
  Layers,
  Sparkles,
  Database,
  Check,
} from "lucide-react";
import { useAuth, BOOTSTRAP_ADMIN_EMAIL } from "../context/AuthContext";
import { AppUser } from "../types";

interface AuthScreenProps {
  onSuccess: (user: AppUser) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    signInWithGoogle,
    signInWithDirectEmail,
    error,
    clearError,
  } = useAuth();

  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGooglePopup = async () => {
    setLocalError(null);
    clearError();
    setIsLoadingGoogle(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        // Auth state will trigger transition
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to sign in with Google");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleDirectLogin = async (targetEmail: string, customName?: string) => {
    setLocalError(null);
    clearError();
    const clean = targetEmail.trim();
    if (!clean || !clean.includes("@")) {
      setLocalError("Please enter a valid Gmail / email address.");
      return;
    }

    setIsLoadingDirect(true);
    try {
      const res = await signInWithDirectEmail(clean, customName || nameInput);
      if (res.success) {
        // Auth state will trigger transition
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to sign in");
    } finally {
      setIsLoadingDirect(false);
    }
  };

  const activeError = localError || error;

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-between bg-[#0a121e] text-[#f1f5f9] overflow-y-auto select-none">
      {/* Background Architectural Blueprint Grid Lines */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00c2c7 1px, transparent 1px), linear-gradient(90deg, #00c2c7 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />

      {/* Top Accent Gradient Bar */}
      <div className="h-[4px] w-full bg-gradient-to-r from-[#f5a623] via-[#e67e22] to-[#00c2c7] shrink-0" />

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col items-center justify-center flex-1">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-[#152033] border border-[#2d4a6a] px-3.5 py-1.5 rounded-full shadow-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-[#00c2c7] tracking-wider uppercase">
              Ashraf Civil Studio · Pro Cloud Workspace
            </span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.2 rounded font-bold border border-amber-500/30">
              v2.5
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Civil Engineering Estimation & File System
          </h1>

          <p className="text-xs sm:text-sm text-[#8ba3c1] max-w-xl mx-auto leading-relaxed">
            Please log in or register to access your personal structural projects. Every engineer's project files are strictly isolated and stored privately in Firebase Cloud.
          </p>
        </div>

        {/* Authentication Card */}
        <div className="w-full max-w-md bg-[#131f31] border border-[#2d4a6a] rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5">
          {/* Active Error Notice */}
          {activeError && (
            <div className="p-3.5 bg-red-500/15 border border-red-500/40 rounded-2xl text-xs text-red-300 flex items-start gap-2.5 animate-in shake duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-200">Authentication Notice</div>
                <div className="text-[11px] mt-0.5 leading-relaxed">{activeError}</div>
                <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2 rounded-xl">
                  Tip: Use <strong>Quick Administrator Sign-In</strong> or enter your email below to bypass browser popup restrictions!
                </div>
              </div>
            </div>
          )}

          {/* Option 1: One-Click Instant Sign-In for engrkalilinux@gmail.com */}
          <div className="bg-gradient-to-r from-amber-500/20 via-[#1a2d48] to-[#142337] border-2 border-amber-500/50 rounded-2xl p-4 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Administrator Access
                </span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono font-bold border border-amber-500/40">
                Super Admin
              </span>
            </div>

            <div>
              <div className="text-sm font-bold text-white">
                engrkalilinux@gmail.com
              </div>
              <p className="text-[11px] text-[#9bb3d1] mt-0.5">
                Instant one-click access with master supervisory control over all civil projects and user directories.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleDirectLogin(BOOTSTRAP_ADMIN_EMAIL, "Engr. Kali (Admin)")}
              disabled={isLoadingDirect}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-4 py-3 rounded-xl text-xs sm:text-sm shadow-xl transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Shield className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isLoadingDirect ? "Signing in..." : "Instant Sign In as engrkalilinux@gmail.com"}
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-[#24374e]" />
            <span className="text-[11px] text-[#8ba3c1] uppercase font-mono font-semibold">Or</span>
            <div className="flex-1 h-[1px] bg-[#24374e]" />
          </div>

          {/* Option 2: Google Authentication Popup */}
          <div>
            <button
              type="button"
              onClick={handleGooglePopup}
              disabled={isLoadingGoogle}
              className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold px-4 py-3 rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 cursor-pointer border border-slate-300 disabled:opacity-50"
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
                {isLoadingGoogle ? "Opening Google Popup..." : "Sign in with Google Account"}
              </span>
            </button>
          </div>

          {/* Option 3: Custom Gmail / Work Email Registration */}
          <div className="bg-[#0f1725] border border-[#24374e] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <User className="w-3.5 h-3.5 text-[#00c2c7]" />
              <span>Sign In / Register with Email Address</span>
            </div>
            <p className="text-[11px] text-[#8ba3c1]">
              Enter your email to create your own isolated workspace. Other users cannot see your projects.
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. engineer.ashraf@gmail.com"
                className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
              />
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Engineer Name (e.g. Engr. Ashraf)"
                className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
              />
              <button
                type="button"
                onClick={() => handleDirectLogin(emailInput)}
                disabled={isLoadingDirect || !emailInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-black px-4 py-2.5 rounded-xl text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
              >
                <span>Register / Open My Workspace</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy & Feature Guarantees */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl text-xs text-[#8ba3c1]">
          <div className="bg-[#111c2c] border border-[#24374e] rounded-xl p-3 flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Strict Isolation</div>
              <div className="text-[10px] text-[#8ba3c1]">No other user can view your files</div>
            </div>
          </div>

          <div className="bg-[#111c2c] border border-[#24374e] rounded-xl p-3 flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#00c2c7] shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Firebase Cloud</div>
              <div className="text-[10px] text-[#8ba3c1]">Firestore cloud persistence</div>
            </div>
          </div>

          <div className="bg-[#111c2c] border border-[#24374e] rounded-xl p-3 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Super Admin</div>
              <div className="text-[10px] text-[#8ba3c1]">Supervisory project control</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-[#5d7a9e] border-t border-[#1a2d48] bg-[#070d16] shrink-0">
        Ashraf Civil Studio · Civil Engineering Estimation System · Protected by Firebase Security Rules
      </footer>
    </div>
  );
};
