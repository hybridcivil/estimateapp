import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
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
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signInWithDirectAdmin: () => Promise<{ success: boolean; error?: string }>;
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
  registerWithEmail: async () => ({ success: false }),
  loginWithEmail: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  signInWithDirectAdmin: async () => ({ success: false }),
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
          let effectiveEmail = user.email;
          if (!effectiveEmail) {
            try {
              const raw = localStorage.getItem("ashraf_auth_session");
              if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.email) effectiveEmail = parsed.email;
              }
            } catch {}
          }
          if (!effectiveEmail) {
            effectiveEmail = "engineer@ashrafstudio.com";
          }

          const isBootstrapAdmin = effectiveEmail.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
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
            email: effectiveEmail,
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
                  email: effectiveEmail,
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

  const fallbackDirectAuth = async (
    email: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const isBootstrapAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
    const role: "admin" | "engineer" = isBootstrapAdmin ? "admin" : "engineer";
    const fallbackName = cleanEmail.split("@")[0].replace(/[\._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const finalName = displayName?.trim() || (isBootstrapAdmin ? "Engr. Kali (Admin)" : `Engr. ${fallbackName}`);
    const now = new Date().toISOString();

    const uid = "usr_" + cleanEmail.replace(/[^a-z0-9]/g, "_");

    if (auth.currentUser && auth.currentUser.email && auth.currentUser.email.toLowerCase() !== cleanEmail) {
      try {
        await signOut(auth);
      } catch {}
    }

    const userData: AppUser = {
      uid,
      email: cleanEmail,
      displayName: finalName,
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

    try {
      await setDoc(
        doc(db, "users", uid),
        {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          createdAt: now,
          lastLoginAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn("Could not sync fallback user to Firestore:", e);
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

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim() || "Civil Engineer";

    if (!cleanEmail || !cleanEmail.includes("@")) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      return { success: false, error: msg };
    }
    if (password.length < 6) {
      const msg = "Password must be at least 6 characters long.";
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      try {
        await updateProfile(cred.user, { displayName: cleanName });
      } catch (profileErr) {
        console.warn("Could not update auth profile displayName:", profileErr);
      }

      const isBootstrapAdmin = cleanEmail === BOOTSTRAP_ADMIN_EMAIL.toLowerCase();
      const role: "admin" | "engineer" = isBootstrapAdmin ? "admin" : "engineer";
      const now = new Date().toISOString();

      const userData: AppUser = {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: null,
        role,
        createdAt: now,
        lastLoginAt: now,
      };

      try {
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: cleanEmail,
          displayName: cleanName,
          role,
          createdAt: now,
          lastLoginAt: now,
        });
      } catch (e) {
        console.warn("Could not save user profile to Firestore:", e);
      }

      try {
        localStorage.setItem("ashraf_auth_session", JSON.stringify(userData));
      } catch {}

      setAppUser(userData);
      setIsAdmin(role === "admin");
      return { success: true };
    } catch (err: any) {
      console.warn("createUserWithEmailAndPassword encountered error:", err.code, err.message);
      let msg = err.message || "Failed to register account.";

      if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists. Please switch to the Sign In tab.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password is too weak. Please choose a password with at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        msg = "The email address format is not valid.";
      } else if (err.code === "auth/operation-not-allowed") {
        return await fallbackDirectAuth(cleanEmail, cleanName);
      }

      setError(msg);
      return { success: false, error: msg };
    }
  };

  const loginWithEmail = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      const msg = "Please enter a valid email address.";
      setError(msg);
      return { success: false, error: msg };
    }
    if (!password) {
      const msg = "Please enter your password.";
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      return { success: true };
    } catch (err: any) {
      console.warn("signInWithEmailAndPassword error:", err.code, err.message);
      let msg = err.message || "Failed to sign in.";
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        msg = "Incorrect email or password. If you do not have an account, please switch to Register.";
      } else if (err.code === "auth/too-many-requests") {
        msg = "Too many failed login attempts. Please wait a moment before trying again.";
      } else if (err.code === "auth/operation-not-allowed") {
        return await fallbackDirectAuth(cleanEmail);
      }
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signInWithDirectAdmin = async (): Promise<{ success: boolean; error?: string }> => {
    return await fallbackDirectAuth(BOOTSTRAP_ADMIN_EMAIL, "Engr. Kali (Admin)");
  };

  const signInWithDirectEmail = async (
    email: string,
    customName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await fallbackDirectAuth(email, customName);
  };

  const logout = async () => {
    setError(null);
    try {
      localStorage.removeItem("ashraf_auth_session");
      await signOut(auth);
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(err.message || "Failed to sign out");
    } finally {
      setAppUser(null);
      setCurrentUser(null);
      setIsAdmin(false);
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
        registerWithEmail,
        loginWithEmail,
        signInWithGoogle,
        signInWithDirectAdmin,
        signInWithDirectEmail,
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
