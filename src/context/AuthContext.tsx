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
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  appUser: null,
  isAdmin: false,
  loading: true,
  error: null,
  signInWithGoogle: async () => {},
  logout: async () => {},
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
            displayName: user.displayName || existingData?.displayName || "Civil Engineer",
            photoURL: user.photoURL || existingData?.photoURL || null,
            role,
            createdAt: existingData?.createdAt || now,
            lastLoginAt: now,
          };

          // Save/update profile in Firestore
          try {
            if (existingData) {
              await updateDoc(userDocRef, {
                displayName: userData.displayName,
                photoURL: userData.photoURL,
                lastLoginAt: now,
              });
            } else {
              await setDoc(userDocRef, {
                uid: userData.uid,
                email: userData.email,
                displayName: userData.displayName,
                photoURL: userData.photoURL,
                role: userData.role,
                createdAt: now,
                lastLoginAt: now,
              });
            }
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

          setAppUser(userData);
          setIsAdmin(role === "admin");
        } catch (err: any) {
          console.error("Auth profile sync error:", err);
        }
      } else {
        setAppUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      // Suppress standard popup closed by user warnings
      if (err.code !== "auth/popup-closed-by-user") {
        setError(err.message || "Failed to sign in with Google");
      }
    }
  };

  const logout = async () => {
    setError(null);
    try {
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
        logout,
        clearError: () => setError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
