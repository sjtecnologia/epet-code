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
    } catch (e: any) {
      console.error('[Firestore] Falha ao criar documento do usuario:', e.code, e.message);
      throw e; // Propaga o erro para que signUp possa tratar
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone: string,
  ) => {
    try {
      console.log('[Auth] Iniciando cadastro para:', email);
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      console.log('[Auth] Usuário criado com sucesso, UID:', credential.user.uid);
      
      await createFirestoreUserDoc(credential.user.uid, name, email, phone);
      console.log('[Auth] Documento Firestore criado com sucesso');
      return { error: null };
    } catch (err: any) {
      console.error('[Auth] Erro durante cadastro:', err.code, err.message);
      return { error: err };
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
