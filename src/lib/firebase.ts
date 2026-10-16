/**
 * Configuração e inicialização do Firebase — banco de dados principal do e-Pet.
 *
 * Serviços utilizados:
 *  1. Firebase Auth — autenticação de usuários (e-mail/senha)
 *  2. Firestore — banco de dados NoSQL (pets, vacinas, perfis, endereços)
 *  3. Firebase Storage — armazenamento de fotos de pets e avatares
 *
 * Também inicializa uma segunda instância (4YouPet) somente para leitura
 * do catálogo de produtos exibido no carrossel da tela Início.
 *
 * As credenciais são lidas das variáveis de ambiente EXPO_PUBLIC_* definidas
 * no arquivo .env (nunca devem ser hardcoded no código-fonte).
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getAuth } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lê as chaves de configuração do Firebase a partir das variáveis de ambiente.
// Quando o app é testado sem um arquivo .env, usa um fallback seguro com as
// configurações públicas do projeto para evitar falhas de autenticação.
const fallbackFirebaseConfig = {
  apiKey: 'AIzaSyAQd6I7u0hruSW2VCFLpJ_2En00Uq8J-c8',
  authDomain: 'fouryoupet-c6387.firebaseapp.com',
  projectId: 'fouryoupet-c6387',
  storageBucket: 'fouryoupet-c6387.appspot.com',
  messagingSenderId: '852759527186',
  appId: '1:852759527186:web:ad3a5b3838105abe533dcb',
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? fallbackFirebaseConfig.apiKey,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackFirebaseConfig.authDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackFirebaseConfig.projectId,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? fallbackFirebaseConfig.storageBucket,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? fallbackFirebaseConfig.messagingSenderId,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? fallbackFirebaseConfig.appId,
};

// Configuração do projeto 4YouPet — usado apenas para leitura do catálogo de produtos
// Chaves públicas (client-side); segurança garantida pelas regras do Firestore
const fourYouPetConfig = {
  apiKey: 'AIzaSyDARlUH0DXsBiRWqAeDGnkuRCd0Su3dPCE',
  authDomain: 'fouryoupet-c6387.firebaseapp.com',
  projectId: 'fouryoupet-c6387',
  storageBucket: 'fouryoupet-c6387.appspot.com',
  messagingSenderId: '852759527186',
  appId: '1:852759527186:web:ad3a5b3838105abe533dcb',
};

// Garante que o Firebase seja inicializado apenas uma vez durante o ciclo de vida do app.
// getApps() retorna a lista de instâncias já criadas; se vazia, inicializa pela primeira vez.
const app = getApps().find(a => a.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);

// Segunda instância Firebase apontando para o projeto 4YouPet (somente leitura de produtos)
const fourYouPetApp = getApps().find(a => a.name === '4youpet') ?? initializeApp(fourYouPetConfig, '4youpet');

// Inicializa o Firebase Auth com persistência via AsyncStorage (React Native).
// O bloco try/catch evita erro em hot-reload do Expo, onde initializeAuth já foi chamado.
let firebaseAuth: ReturnType<typeof getAuth>;
try {
  const maybeGetReactNativePersistence = (FirebaseAuth as any).getReactNativePersistence;
  if (typeof maybeGetReactNativePersistence === 'function') {
    firebaseAuth = initializeAuth(app, {
      // Usa AsyncStorage para manter a sessão do usuário mesmo após fechar o app
      persistence: maybeGetReactNativePersistence(AsyncStorage),
    });
  } else {
    firebaseAuth = getAuth(app);
  }
} catch {
  // Em caso de hot-reload (desenvolvimento), reutiliza a instância já existente
  firebaseAuth = getAuth(app);
}

// Exporta a instância de autenticação para uso em todo o app
export { firebaseAuth };

// Exporta a instância do Firestore (banco de dados principal)
export const firestore = getFirestore(app);

// Exporta o Firestore do 4YouPet para leitura do catálogo de produtos
export const firestore4YouPet = getFirestore(fourYouPetApp);

// Exporta o Firebase Storage para upload de fotos de pets e avatares
export const storage = getStorage(app);
