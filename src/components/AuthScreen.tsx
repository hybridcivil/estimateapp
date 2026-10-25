import React, { useState } from "react";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  Compass,
  Sparkles,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthScreenProps {
  onSuccess: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    registerWithEmail,
    loginWithEmail,
    signInWithGoogle,
    signInWithDirectEmail,
    error,
    clearError,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!displayName.trim()) {
      setLocalError("Please enter your name or engineer title.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setLocalError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithEmail(email, password, displayName);
      if (res.success) {
        onSuccess();
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (err: any) {
      setLocalError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setLocalError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      if (password) {
        const res = await loginWithEmail(cleanEmail, password);
        if (res.success) {
          onSuccess();
          return;
        }
      }
      // If no password or fallback desired
      const directRes = await signInWithDirectEmail(cleanEmail);
      if (directRes.success) {
        onSuccess();
      } else if (directRes.error) {
        setLocalError(directRes.error);
      }
    } catch (err: any) {
      setLocalError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    clearError();
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        onSuccess();
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (err: any) {
      setLocalError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-screen w-full bg-[#0a121e] text-[#f1f5f9] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-x-hidden">
      {/* Background Architectural Blueprint Grid Lines */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#00c2c7 1px, transparent 1px), linear-gradient(90deg, #00c2c7 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Radial Glow */}
      <div className="absolute w-[500px] h-[500px] bg-[#00c2c7]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md bg-[#121c2d] border border-[#2d4a6a] rounded-3xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md">
        {/* Top Header */}
        <div className="p-6 sm:p-7 text-center border-b border-[#24374e] bg-gradient-to-b from-[#172b45] to-[#121c2d] relative">
          {/* Logo Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a2d47] to-[#0f1c2e] border-2 border-[#00c2c7] shadow-lg flex items-center justify-center p-2 mb-3 relative">
            <svg
              className="w-full h-full filter drop-shadow-[0_0_6px_rgba(0,194,199,0.5)]"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="16" y="22" width="5" height="28" rx="1.5" fill="#00c2c7" />
              <rect x="29.5" y="16" width="5" height="34" rx="1.5" fill="#00c2c7" />
              <rect x="43" y="22" width="5" height="28" rx="1.5" fill="#00c2c7" />
              <rect x="14" y="24" width="36" height="3.5" rx="1" fill="#38bdf8" />
              <rect x="14" y="36" width="36" height="3.5" rx="1" fill="#38bdf8" />
              <rect x="12" y="48" width="40" height="4.5" rx="1.5" fill="#00c2c7" />
              <path d="M 32 10 L 20 46 M 32 10 L 44 46" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="32" cy="10" r="3.5" fill="#f5a623" stroke="#fff" strokeWidth="1" />
            </svg>
            <div className="absolute -bottom-1.5 -right-1.5 bg-[#f5a623] text-[#0f1c2e] p-1 rounded-lg shadow">
              <Compass className="w-3 h-3 animate-spin" style={{ animationDuration: "10s" }} />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00c2c7]/15 border border-[#00c2c7]/30 text-[10px] font-bold text-[#00c2c7] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3 h-3" />
            Civil & Structural Suite
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            ASHRAF CIVIL STUDIO
          </h1>
          <p className="text-xs text-[#8ba3c1] mt-1 max-w-xs mx-auto">
            Sign in to access your personal engineering projects, BOQ schedules, and calculation files.
          </p>

          {/* Privacy Notice Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] text-emerald-300 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Private Workspace: Your projects are never shared or visible to others</span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#24374e] bg-[#0e1726]">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setLocalError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === "login"
                ? "text-[#00c2c7] border-[#00c2c7] bg-[#142337]"
                : "text-[#8ba3c1] border-transparent hover:text-white hover:bg-[#121c2d]"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setLocalError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
              activeTab === "register"
                ? "text-[#00c2c7] border-[#00c2c7] bg-[#142337]"
                : "text-[#8ba3c1] border-transparent hover:text-white hover:bg-[#121c2d]"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Register New Workspace</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {/* Active Error / Notice */}
          {displayedError && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                {displayedError}
              </div>
            </div>
          )}

          {activeTab === "login" ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@example.com"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#8ba3c1]">
                    Password <span className="text-[#5d7a9e] font-normal">(optional if using Quick Email Sign In)</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (optional)"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#5d7a9e] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-[#00c2c7]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "Authenticating..." : "Sign In to Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                  Engineer Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Engineer Name / Anonymous"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="engineer@example.com"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                  Create Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create secure password"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#5d7a9e] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8ba3c1] mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#5d7a9e] absolute left-3 top-3" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-[#00c2c7] to-[#2ecc71] hover:from-[#00a8ad] hover:to-[#27ae60] text-[#0f1c2e] font-bold py-2.5 px-4 rounded-xl text-xs transition active:scale-95 shadow-lg shadow-[#00c2c7]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "Creating Personal Workspace..." : "Create Account & Workspace"}</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#24374e]" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-[#121c2d] px-2 text-[#8ba3c1] font-semibold">
                Or Sign In With Google
              </span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer border border-slate-300 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
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
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-[#0a121e]/80 border-t border-[#24374e] text-center text-[10px] text-[#8ba3c1]">
          Dolphin Box • Developer: Anonymous • Professional Civil & Structural Suite
        </div>
      </div>
    </div>
  );
};
