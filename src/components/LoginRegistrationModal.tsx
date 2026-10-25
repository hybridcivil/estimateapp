import React, { useState } from "react";
import {
  Shield,
  User,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { AppUser } from "../types";

interface LoginRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AppUser) => void;
}

export const LoginRegistrationModal: React.FC<LoginRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const {
    signInWithGoogle,
    signInWithDirectEmail,
    error,
    clearError,
    currentUser,
    appUser,
    isAdmin,
    logout,
  } = useAuth();

  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGooglePopup = async () => {
    setLocalError(null);
    clearError();
    setIsLoadingGoogle(true);
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        onClose();
      } else if (res.error) {
        setLocalError(res.error);
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to sign in with Google");
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  const handleDirectEmail = async (emailToUse?: string, customName?: string) => {
    setLocalError(null);
    clearError();
    const targetEmail = (emailToUse || emailInput).trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      setLocalError("Please enter a valid Gmail / email address.");
      return;
    }

    setIsLoadingDirect(true);
    try {
      const res = await signInWithDirectEmail(targetEmail, customName || nameInput);
      if (res.success) {
        onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#142337] border border-[#2d4a6a] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#24374e] bg-gradient-to-r from-[#172b45] to-[#121c2d] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00c2c7]/20 border border-[#00c2c7]/40 flex items-center justify-center text-[#00c2c7]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Account Login & Registration</span>
              </h2>
              <p className="text-[11px] text-[#8ba3c1]">
                Firebase Cloud Authentication & Workspace Management
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8ba3c1] hover:text-white rounded-lg hover:bg-[#24374e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Active Error Notice */}
          {activeError && (
            <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-200">Authentication Notice</div>
                <div className="text-[11px] mt-0.5 leading-relaxed">{activeError}</div>
                <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg">
                  Tip: If browser blocked the Google popup or the domain is not yet in Firebase Console authorized list, use the <strong>Quick Gmail Sign-In</strong> option below to access your projects immediately!
                </div>
              </div>
            </div>
          )}

          {/* Already logged in indicator */}
          {appUser ? (
            <div className="bg-[#1a2d48] border border-[#2d4a6a] rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  {(appUser.displayName || appUser.email || "U")[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-sm truncate">
                    {appUser.displayName}
                  </div>
                  <div className="text-xs text-[#8ba3c1] font-mono truncate">
                    {appUser.email}
                  </div>
                  <div className="mt-1">
                    {isAdmin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                        <Shield className="w-3 h-3" />
                        System Administrator (Master Control)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00c2c7]/20 text-[#00c2c7] border border-[#00c2c7]/40">
                        Civil Engineer (Personal Cloud Workspace)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#24374e]">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-semibold"
                >
                  Sign Out of Account
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#00c2c7] text-[#0f1c2e] font-bold px-4 py-1.5 rounded-lg text-xs"
                >
                  Continue to Workspace
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Google Popup Auth */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#8ba3c1] uppercase tracking-wider">
                  Sign in with Google Account:
                </div>

                <button
                  type="button"
                  onClick={handleGooglePopup}
                  disabled={isLoadingGoogle}
                  className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition active:scale-95 cursor-pointer border border-slate-300 disabled:opacity-50"
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
                  <span>
                    {isLoadingGoogle ? "Opening Google Popup..." : "Sign in with Google Popup"}
                  </span>
                </button>
              </div>

              {/* Option 3: Custom Gmail / Email Workspace Sign-In */}
              <div className="bg-[#111c2c] border border-[#24374e] rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#00c2c7]" />
                  <span>Sign In with Your Gmail / Work Email</span>
                </div>
                <p className="text-[11px] text-[#8ba3c1]">
                  Enter your email address to register or access your dedicated personal estimation project repository.
                </p>

                <div className="space-y-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. engineer@example.com"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7]"
                  />
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Full Name (optional, e.g. Anonymous)"
                    className="w-full bg-[#18273b] border border-[#2d4a6a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#5d7a9e] outline-none focus:border-[#00c2c7]"
                  />
                  <button
                    type="button"
                    onClick={() => handleDirectEmail()}
                    disabled={isLoadingDirect || !emailInput.trim()}
                    className="w-full flex items-center justify-center gap-1.5 bg-[#00c2c7] hover:bg-[#00a8ad] text-[#0f1c2e] font-bold px-3 py-2 rounded-lg text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <span>Sign In / Register Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Security & Isolation Features */}
          <div className="pt-2 border-t border-[#24374e] grid grid-cols-2 gap-2 text-[11px] text-[#8ba3c1]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Isolated Personal Projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Admin Supervisory Control</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Firebase Cloud Firestore Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Local Offline Backup Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
