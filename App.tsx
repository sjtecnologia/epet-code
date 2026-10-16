/**
 * App.tsx — ponto de entrada do aplicativo e-Pet.
 *
 * Estrutura de renderização:
 *  1. Enquanto `splashDone` for false, exibe a SplashScreen animada.
 *  2. Após a splash finalizar, renderiza o app completo:
 *     - SafeAreaProvider: garante que o conteúdo respeita as áreas seguras
 *       do dispositivo (notch, barra de status, etc.)
 *     - AuthProvider: disponibiliza o contexto de autenticação para todas as telas
 *     - Navigation: decide qual fluxo exibir (login ou app principal)
 *     - StatusBar: controla a cor e estilo da barra de status do sistema
 */
import React, { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexts/AuthContext';
import Navigation from './src/navigation';
import SplashScreen from './src/screens/Splash/SplashScreen';
import CustomAlertComponent, { CustomAlertRef } from './src/components/CustomAlert';
import { registerAlertRef } from './src/lib/alert';

export default function App() {
  // Controla se a splash screen já foi exibida e finalizada
  const [splashDone, setSplashDone] = useState(false);
  const alertRef = useRef<CustomAlertRef>(null);

  // Enquanto a splash não terminar, renderiza apenas ela (tela cheia)
  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // App principal — renderizado após a splash terminar
  return (
    <SafeAreaProvider>
      {/* AuthProvider torna user, signIn, signOut disponíveis para todas as telas */}
      <AuthProvider>
        {/* Navigation decide se mostra o fluxo de login ou o app logado */}
        <Navigation />
        {/* StatusBar ajusta estilo da barra de status conforme o tema da tela */}
        <StatusBar style="auto" />
      </AuthProvider>
      {/* Alert customizado — montado fora do AuthProvider para ser acessível globalmente */}
      <CustomAlertComponent ref={(r) => { alertRef.current = r; registerAlertRef(r); }} />
    </SafeAreaProvider>
  );
}
