import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../lib/firebase';

type AuthContextType = {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Formato mínimo dos erros lançados pelo Firebase Auth/Firestore */
export type FirebaseLikeError = { code?: string; message?: string };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const createFirestoreUserDoc = async (
    uid: string,
    name: string,
    email: string,
    phone?: string,
  ) => {
    try {
      const userDocRef = doc(firestore, 'users', uid);
      const existing = await getDoc(userDocRef);
      if (!existing.exists()) {
        await setDoc(userDocRef, {
          name,
          email,
          celular: phone ?? null,
          address: [],
          checked: false,
          hasCompletedFirstPurchase: false,
        });
      }
    } catch (e) {
      const err = e as FirebaseLikeError;
      console.error('[Firestore] Falha ao criar documento do usuario:', err.code, err.message);
      throw e; // Propaga o erro para que signUp possa tratar
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => {
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await createFirestoreUserDoc(credential.user.uid, name, email, phone);
      console.log('[Auth] Conta criada e documento Firestore criado');
      return { error: null };
    } catch (err) {
      const e = err as FirebaseLikeError;
      console.error('[Auth] Erro durante cadastro:', e.code, e.message);
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
