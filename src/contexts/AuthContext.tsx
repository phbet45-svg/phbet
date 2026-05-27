import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, isMockEnvironment } from "../lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword } from "firebase/auth";
import { getUserProfile, createUserProfile, subscribeToCollection, subscribeToUserProfile } from "../lib/dbService";
import { UserProfile } from "../types";

interface AuthContextType {
  currentUser: FirebaseUserType | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isCambista: boolean;
  isCliente: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  quickLogin: (uid: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface FirebaseUserType {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUserType | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real profile from DB or falls back with auto-role allocation
  async function loadProfile(uid: string, email?: string | null) {
    console.log("[PH_BET] AuthContext - Loading profile for:", uid);
    let profile = await getUserProfile(uid);
    
    // If not found by UID but we have an email, try findings by email (reconciliation for admin-created accounts)
    if (!profile && email) {
      console.log("[PH_BET] AuthContext - UID not found, trying email reconciliation for:", email);
      const { findProfileByIdentifier, deleteUserProfile } = await import("../lib/dbService");
      const existingByEmail = await findProfileByIdentifier(email);
      
      if (existingByEmail) {
        console.log("[PH_BET] AuthContext - Found profile by email. Reconciling UID.");
        const oldUid = existingByEmail.uid;
        profile = { ...existingByEmail, uid };
        await createUserProfile(profile);
        
        // Delete old ghost profile if it had a temporary ID
        if (oldUid.startsWith("cam_") || oldUid.startsWith("ext_") || oldUid === "temp_id_for_existing_user" || oldUid.length < 10) {
          console.log("[PH_BET] AuthContext - Deleting legacy ghost profile:", oldUid);
          try {
            await deleteUserProfile(oldUid);
          } catch (deleteErr: any) {
            console.warn("[PH_BET] AuthContext - Non-critical: Could not delete legacy ghost profile from client (requires admin):", deleteErr);
          }
        }
      }
    }

    console.log("[PH_BET] AuthContext - Profile fetched:", profile);
    
    // Determine if admin credentials (phbet@x.com or phbet45@gmail.com or ph@x.com)
    const normalizedEmail = email?.toLowerCase() || profile?.email?.toLowerCase();
    const isPhBetAdmin = normalizedEmail === "phbet@x.com" || normalizedEmail === "phbet45@gmail.com" || normalizedEmail === "ph@x.com" || uid === "admin123";

    if (!profile && email) {
      console.log("[PH_BET] AuthContext - Profile not found, creating new (defaulting to cliente)");
      profile = {
        uid,
        name: isPhBetAdmin ? "PH Admin (Dono)" : "Usuário PH BET",
        email: email.toLowerCase(),
        phone: "",
        role: isPhBetAdmin ? "admin" : "cliente",
        status: "active",
        commissionPercentage: 0,
        createdAt: new Date().toISOString()
      };
      await createUserProfile(profile);
    } else if (profile && isPhBetAdmin && profile.role !== "admin") {
      console.log("[PH_BET] AuthContext - Elevating role to admin");
      // Elevate to admin role automatically for administrative requests
      profile.role = "admin";
      await createUserProfile(profile);
    }
    setUserProfile(profile);
    console.log("[PH_BET] AuthContext - Final userProfile set:", profile);
  }

  // Refresh user data manually
  async function refreshProfile() {
    if (currentUser) {
      await loadProfile(currentUser.uid, currentUser.email);
    }
  }

  // Quick Login for testing different personas smoothly
  async function quickLogin(uid: string) {
    setLoading(true);
    const profile = await getUserProfile(uid);
    if (profile) {
      setCurrentUser({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.name
      });
      setUserProfile(profile);
      // Persist in mock system
      localStorage.setItem("phbet_active_mock_user", uid);
    }
    setLoading(false);
  }

  // Standard Login (supports email or phone number + password)
  async function login(identifier: string, password: string) {
    setLoading(true);
    const idLower = identifier.toLowerCase();
    try {
      if (isMockEnvironment) {
        // ... (mock logic)
        const users = await import("../lib/dbService").then(m => m.getUsers());
        let matchUser = users.find(u => 
          u.email.toLowerCase() === idLower || 
          u.phone.replace(/\s+/g, "") === idLower.replace(/\s+/g, "")
        );
        
        // Auto create phbet@x.com / phbet45@gmail.com admin in Mock if not present
        if (!matchUser && (idLower === "phbet@x.com" || idLower === "phbet45@gmail.com")) {
          const newMockAdmin: UserProfile = {
            uid: "admin_phbet",
            name: "PH Admin (Dono)",
            email: idLower,
            phone: "11999999999",
            role: "admin",
            status: "active",
            commissionPercentage: 0,
            createdAt: new Date().toISOString()
          };
          await import("../lib/dbService").then(m => m.createUserProfile(newMockAdmin));
          // Refetch users
          const updatedUsers = await import("../lib/dbService").then(m => m.getUsers());
          matchUser = updatedUsers.find(u => u.email.toLowerCase() === idLower);
        }

        if (matchUser) {
          // If the profile has a password specified, check it
          if (matchUser.password && matchUser.password !== password) {
            throw new Error("Senha incorreta cadastrada para este parceiro.");
          }
          await quickLogin(matchUser.uid);
          return;
        }
        throw new Error("Usuário ou Telefone não cadastrado nos dados locais da PH BET.");
      } else {
        // Real environment
        let resolvedEmailForAuth = idLower;
        
        // 1. Try to find the profile in Firestore first (Identifier lookup)
        const { findProfileByIdentifier } = await import("../lib/dbService");
        const matchProfile = await findProfileByIdentifier(idLower);
        
        if (matchProfile) {
          console.log("[PH_BET] Login: Found profile in DB with role:", matchProfile.role);
          resolvedEmailForAuth = matchProfile.email;
          
          // Check password in Firestore (if stored there by Admin)
          if (matchProfile.password && matchProfile.password !== password) {
            throw new Error("Senha incorreta cadastrada para este parceiro/cambista no banco PH BET.");
          }
        }

        // 2. Try singing in. If fails because user doesn't exist, and we have a DB profile, try creating.
        try {
          console.log("[PH_BET] Login: Attempting Auth sign-in for:", resolvedEmailForAuth);
          const cred = await signInWithEmailAndPassword(auth, resolvedEmailForAuth, password);
          await loadProfile(cred.user.uid, resolvedEmailForAuth);
        } catch (authError: any) {
          console.warn("[PH_BET] Login: Auth failure code:", authError.code);
          
          if ((authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential" || authError.code === "auth/invalid-password") && matchProfile) {
            // User exists in Firestore but potentially not in Auth or mismatch. 
            // If they are a Cambista, we try to auto-migrate them if the password matched the DB one.
            if (matchProfile.password === password) {
              console.log("[PH_BET] Login: Auto-provisioning Auth for bookie/cambista:", resolvedEmailForAuth);
              const { createUserWithEmailAndPassword } = await import("firebase/auth");
              try {
                const cred = await createUserWithEmailAndPassword(auth, resolvedEmailForAuth, password);
                await loadProfile(cred.user.uid, resolvedEmailForAuth);
              } catch (createErr: any) {
                if (createErr.code === "auth/email-already-in-use") {
                  // If email is in use but sign-in failed, it's likely a wrong password
                  throw new Error("Senha incorreta. Verifique suas credenciais.");
                }
                throw createErr;
              }
            } else {
              throw new Error("Identificador ou senha inválidos.");
            }
          } else if (
            (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-credential") &&
            (resolvedEmailForAuth === "phbet@x.com" || resolvedEmailForAuth === "phbet45@gmail.com")
          ) {
            // Auto-provision real admin
            console.log("[PH_BET] Login: Auto-provisioning admin:", resolvedEmailForAuth);
            const { createUserWithEmailAndPassword } = await import("firebase/auth");
            const cred = await createUserWithEmailAndPassword(auth, resolvedEmailForAuth, password);
            await loadProfile(cred.user.uid, resolvedEmailForAuth);
          } else {
            // Handle common cases for users
            if (authError.code === "auth/wrong-password" || authError.code === "auth/invalid-credential" || authError.code === "auth/invalid-password") {
              throw new Error("Identificador ou senha inválidos.");
            }
            throw authError;
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      throw err;
    }
  }

  // Logout
  async function logout() {
    setLoading(true);
    if (!isMockEnvironment) {
      await firebaseSignOut(auth);
    }
    localStorage.removeItem("phbet_active_mock_user");
    setCurrentUser(null);
    setUserProfile(null);
    setLoading(false);
  }

  useEffect(() => {
    // Listen to Firebase auth if NOT in mock
    if (!isMockEnvironment) {
      const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });
          await loadProfile(user.uid, user.email);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });
      return unsubscribeAuth;
    } else {
      // Local mock persistence
      const savedUid = localStorage.getItem("phbet_active_mock_user");
      if (savedUid) {
        quickLogin(savedUid);
      } else {
        // Default guest visitor initially
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    }
  }, []);

  // Real-time listener to user records reflecting immediately
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserProfile(currentUser.uid, () => {
      loadProfile(currentUser.uid);
    });
    return unsub;
  }, [currentUser]);

  const isAdmin = userProfile?.role === "admin";
  const isCambista = userProfile?.role === "cambista";
  const isCliente = userProfile?.role === "cliente";

  const value = {
    currentUser,
    userProfile,
    loading,
    isAdmin,
    isCambista,
    isCliente,
    login,
    logout,
    quickLogin,
    refreshProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
