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
 * no arquivo .env (dev) ou nas envs do EAS Build (produção). O app falha com
 * erro explícito se alguma variável estiver ausente — não há fallback hardcoded.
 */
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAuth, getAuth } from 'firebase/auth';
import type { Persistence } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Lê as chaves de configuração do Firebase a partir das variáveis de ambiente
// EXPO_PUBLIC_* definidas no arquivo .env (dev) ou nas envs do EAS Build.
// Se qualquer uma faltar, o app falha com um erro explícito — nunca com um
// erro confuso de autenticação em runtime.
const requiredEnv = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => `EXPO_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missingEnv.length > 0) {
  throw new Error(
    `Configuração do Firebase ausente: ${missingEnv.join(', ')}. ` +
      'Copie .env.example para .env e preencha as chaves (dev), ou configure as ' +
      'variáveis EXPO_PUBLIC_* no EAS Build (produção).',
  );
}

const firebaseConfig = {
  apiKey: requiredEnv.apiKey,
  authDomain: requiredEnv.authDomain,
  projectId: requiredEnv.projectId,
  storageBucket: requiredEnv.storageBucket,
  messagingSenderId: requiredEnv.messagingSenderId,
  appId: requiredEnv.appId,
};

// Garante que o Firebase seja inicializado apenas uma vez durante o ciclo de vida do app.
// getApps() retorna a lista de instâncias já criadas; se vazia, inicializa pela primeira vez.
const app = getApps().find((a) => a.name === '[DEFAULT]') ?? initializeApp(firebaseConfig);

// Segunda instância Firebase apontando para o projeto 4YouPet (somente leitura de produtos).
// Usa a mesma configuração do projeto principal — a instância nomeada garante
// que Auth/Firestore do catálogo não misturem com a sessão do usuário.
const fourYouPetApp =
  getApps().find((a) => a.name === '4youpet') ?? initializeApp(firebaseConfig, '4youpet');

// Inicializa o Firebase Auth com persistência via AsyncStorage (React Native).
// O bloco try/catch evita erro em hot-reload do Expo, onde initializeAuth já foi chamado.
let firebaseAuth: ReturnType<typeof getAuth>;
try {
  const maybeGetReactNativePersistence = (
    FirebaseAuth as unknown as {
      getReactNativePersistence?: (storage: unknown) => Persistence;
    }
  ).getReactNativePersistence;
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
