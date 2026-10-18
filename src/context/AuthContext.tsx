import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../services/firebase";
import { AppUser } from "../types";

export const BOOTSTRAP_ADMIN_EMAIL = "engrkalilinux@gmail.com";

interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithDirectEmail: (email: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  appUser: null,
  isAdmin: false,
  loading: true,
  error: null,
  signInWithGoogle: async () => ({ success: false }),
  signInWithDirectEmail: async () => ({ success: false }),
  logout: async () => {},
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(() => {
    try {
      const raw = localStorage.getItem("ashraf_auth_session");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("ashraf_auth_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.role === "admin";
      }
    } catch {}
    return false;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const isBootstrapAdmin = user.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
          const userDocRef = doc(db, "users", user.uid);
          
          let role: "admin" | "engineer" = isBootstrapAdmin ? "admin" : "engineer";

          // Read existing profile if available
          let existingData: any = null;
          try {
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              existingData = userSnap.data();
              if (existingData.role === "admin" || isBootstrapAdmin) {
                role = "admin";
              }
            }
          } catch (e) {
            console.warn("Could not read user profile from firestore:", e);
          }

          // Check admins collection
          if (!isBootstrapAdmin) {
            try {
              const adminSnap = await getDoc(doc(db, "admins", user.uid));
              if (adminSnap.exists()) {
                role = "admin";
              }
            } catch {
              // Ignore admin read check failure
            }
          }

          const now = new Date().toISOString();
          const userData: AppUser = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || existingData?.displayName || (isBootstrapAdmin ? "Engr. Kali (Admin)" : "Civil Engineer"),
            photoURL: user.photoURL || existingData?.photoURL || null,
            role,
            createdAt: existingData?.createdAt || now,
            lastLoginAt: now,
          };

          // Save/update profile in Firestore safely (without sending null photoURL)
          try {
            const docToSave: any = {
              uid: userData.uid,
              email: userData.email,
              displayName: userData.displayName,
              role: userData.role,
              lastLoginAt: now,
            };
            if (userData.photoURL) {
              docToSave.photoURL = userData.photoURL;
            }
            if (!existingData) {
              docToSave.createdAt = now;
            }

            await setDoc(userDocRef, docToSave, { merge: true });
          } catch (writeErr) {
            console.warn("Could not persist user profile to Firestore:", writeErr);
          }

          // Bootstrap admin record if applicable
          if (role === "admin") {
            try {
              await setDoc(
                doc(db, "admins", user.uid),
                {
                  uid: user.uid,
                  email: user.email,
                  grantedAt: now,
                },
                { merge: true }
              );
            } catch (adminErr) {
              console.warn("Could not sync to admins collection:", adminErr);
            }
          }

          try {
            localStorage.setItem("ashraf_auth_session", JSON.stringify(userData));
          } catch {}

          setAppUser(userData);
          setIsAdmin(role === "admin");
        } catch (err: any) {
          console.error("Auth profile sync error:", err);
        }
      } else {
        // If no Firebase currentUser, check if we had a persistent direct email session
        const storedRaw = localStorage.getItem("ashraf_auth_session");
        if (storedRaw) {
          try {
            const storedUser = JSON.parse(storedRaw);
            setAppUser(storedUser);
            setIsAdmin(storedUser.role === "admin");
          } catch {
            setAppUser(null);
            setIsAdmin(false);
          }
        } else {
          setAppUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      return { success: true };
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      let msg = err.message || "Failed to sign in with Google";
      if (err.code === "auth/popup-blocked") {
        msg = "The sign-in popup was blocked by the browser. Please use Quick Gmail Sign-In below or allow popups.";
      } else if (err.code === "auth/unauthorized-domain") {
        msg = "This applet domain is not yet in Firebase Console authorized domains. Use Quick Gmail Sign-In below to access all features immediately!";
      } else if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
        msg = "Sign-in popup was closed before completing.";
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signInWithDirectEmail = async (
    email: string,
    customName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      const msg = "Please enter a valid Gmail / email address.";
      setError(msg);
      return { success: false, error: msg };
    }

    const isBootstrapAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const role: "admin" | "engineer" = isBootstrapAdmin ? "admin" : "engineer";
    const uid = "usr_" + cleanEmail.replace(/[^a-z0-9]/g, "_");
    const now = new Date().toISOString();

    const fallbackName = cleanEmail.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const displayName = customName?.trim() || (isBootstrapAdmin ? "Engr. Kali (Admin)" : `Engr. ${fallbackName}`);

    const userData: AppUser = {
      uid,
      email: cleanEmail,
      displayName,
      photoURL: null,
      role,
      createdAt: now,
      lastLoginAt: now,
    };

    try {
      localStorage.setItem("ashraf_auth_session", JSON.stringify(userData));
    } catch {}

    setAppUser(userData);
    setIsAdmin(role === "admin");

    // Attempt background sync to Firestore
    try {
      await setDoc(doc(db, "users", uid), {
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        createdAt: now,
        lastLoginAt: now,
      }, { merge: true });
    } catch (e) {
      console.warn("Could not sync direct email user to Firestore:", e);
    }

    if (role === "admin") {
      try {
        await setDoc(
          doc(db, "admins", uid),
          {
            uid: userData.uid,
            email: userData.email,
            grantedAt: now,
          },
          { merge: true }
        );
      } catch {}
    }

    return { success: true };
  };

  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem("ashraf_auth_session");
      await signOut(auth);
      setAppUser(null);
      setIsAdmin(false);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(err.message || "Failed to sign out");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        appUser,
        isAdmin,
        loading,
        error,
        signInWithGoogle,
        signInWithDirectEmail,
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
