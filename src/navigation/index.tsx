/**
 * navigation/index.tsx — configuração central de navegação do app e-Pet.
 *
 * Estrutura de stacks e tabs:
 *
 *  NavigationContainer
 *  ├── AuthStack (usuário não logado)
 *  │   ├── Login
 *  │   ├── Register
 *  │   └── (AddAddress — via AddressOnboarding wrapper)
 *  ├── AddressOnboarding (logado, mas sem endereço cadastrado)
 *  │   └── AddAddress
 *  └── MainTabs (logado com endereço)
 *      ├── HomeTab → DashboardStack
 *      │   ├── Dashboard
 *      │   ├── NewPet
 *      │   ├── PetCard
 *      │   ├── EditPet
 *      │   ├── FourYouPetPet
 *      │   ├── EditFourYouPet
 *      │   ├── FourYouPetCard
 *      │   └── Vaccines
 *      ├── SearchTab → SearchScreen
 *      └── ProfileTab → ProfileStack
 *          ├── ProfileMain
 *          ├── EditProfile
 *          ├── ManageAddresses
 *          ├── Notifications
 *          ├── Privacy
 *          ├── Help
 *          └── Link4YouPet
 */
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../lib/firebase';
import { colors } from '../constants/colors';
import { DashboardStackParamList, MyPetsStackParamList, RootStackParamList, ProfileStackParamList, MainTabsParamList } from '../types/navigation.types';

import { useAuth } from '../contexts/AuthContext';

// Telas de autenticação
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import AddAddressScreen from '../screens/Auth/AddAddressScreen';

// Telas do Dashboard (gestão de pets e-Pet)
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import NewPetScreen from '../screens/Dashboard/NewPetScreen';
import PetCardScreen from '../screens/Dashboard/PetCardScreen';
import VaccinesScreen from '../screens/Dashboard/VaccinesScreen';
import EditPetScreen from '../screens/Dashboard/EditPetScreen';
import ProntuarioScreen from '../screens/Dashboard/ProntuarioScreen';
import PesosScreen from '../screens/Dashboard/PesosScreen';

// Tela Meus Pets
import MyPetsScreen from '../screens/Dashboard/MyPetsScreen';

// Telas do 4YouPet (pets importados do Firebase)
import FourYouPetPetScreen from '../screens/Dashboard/FourYouPetPetScreen';
import EditFourYouPetScreen from '../screens/Dashboard/EditFourYouPetScreen';
import FourYouPetCardScreen from '../screens/Dashboard/FourYouPetCardScreen';

// Telas de Perfil
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EditProfileScreen from '../screens/Profile/EditProfileScreen';
import NotificationsScreen from '../screens/Profile/NotificationsScreen';
import PrivacyScreen from '../screens/Profile/PrivacyScreen';
import HelpScreen from '../screens/Profile/HelpScreen';
import ManageAddressesScreen from '../screens/Profile/ManageAddressesScreen';
import Link4YouPetScreen from '../screens/Profile/Link4YouPetScreen';

// Tela de Busca
import SearchScreen from '../screens/Search/SearchScreen';

// Instâncias dos navegadores tipados
const Stack = createNativeStackNavigator<RootStackParamList>();
const DashboardStack_Navigator = createNativeStackNavigator<DashboardStackParamList>();
const MyPetsStack_Navigator = createNativeStackNavigator<MyPetsStackParamList>();
const ProfileStack_Navigator = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<MainTabsParamList>();

/**
 * AuthStack — fluxo de telas exibido quando o usuário NÃO está autenticado.
 * Todas as telas deste stack não têm header nativo (headerShown: false).
 */
function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} />
    </Stack.Navigator>
  );
}

/**
 * DashboardStack — stack interno da aba "Início".
 * Gerencia todas as telas relacionadas a pets (listagem, cadastro, edição, carteira, vacinas).
 */
function DashboardStack() {
  return (
    <DashboardStack_Navigator.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      {/* Tela inicial: lista de todos os pets (e-Pet + 4YouPet) */}
      <DashboardStack_Navigator.Screen name="Dashboard" component={DashboardScreen} />
      {/* Formulário de cadastro de novo pet */}
      <DashboardStack_Navigator.Screen name="NewPet" component={NewPetScreen} />
      {/* Carteira digital do pet (QR Code + informações) — animação de baixo para cima */}
      <DashboardStack_Navigator.Screen name="PetCard" component={PetCardScreen} options={{ animation: 'fade_from_bottom' }} />
      {/* Edição de pet cadastrado no e-Pet */}
      <DashboardStack_Navigator.Screen name="EditPet" component={EditPetScreen} />
      {/* Detalhes de pet importado do 4YouPet */}
      <DashboardStack_Navigator.Screen name="FourYouPetPet" component={FourYouPetPetScreen} options={{ animation: 'slide_from_right' }} />
      {/* Edição de pet do 4YouPet */}
      <DashboardStack_Navigator.Screen name="EditFourYouPet" component={EditFourYouPetScreen} options={{ animation: 'slide_from_right' }} />
      {/* Carteira digital de pet do 4YouPet */}
      <DashboardStack_Navigator.Screen name="FourYouPetCard" component={FourYouPetCardScreen} options={{ animation: 'fade_from_bottom' }} />
      {/* Gerenciamento de vacinas de um pet */}
      <DashboardStack_Navigator.Screen name="Vaccines" component={VaccinesScreen} options={{ animation: 'slide_from_right' }} />
      {/* Prontuário médico do pet */}
      <DashboardStack_Navigator.Screen name="Prontuario" component={ProntuarioScreen} options={{ animation: 'slide_from_right' }} />
      {/* Controle de peso do pet */}
      <DashboardStack_Navigator.Screen name="Pesos" component={PesosScreen} options={{ animation: 'slide_from_right' }} />
    </DashboardStack_Navigator.Navigator>
  );
}

/**
 * MyPetsStack — stack interno da aba "Meus Pets".
 * Gerencia a lista de pets e navegação para card, edição e vacinas.
 */
function MyPetsStack() {
  return (
    <MyPetsStack_Navigator.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <MyPetsStack_Navigator.Screen name="MyPetsList" component={MyPetsScreen} />
      <MyPetsStack_Navigator.Screen name="NewPet" component={NewPetScreen} />
      <MyPetsStack_Navigator.Screen name="PetCard" component={PetCardScreen} options={{ animation: 'fade_from_bottom' }} />
      <MyPetsStack_Navigator.Screen name="EditPet" component={EditPetScreen} />
      <MyPetsStack_Navigator.Screen name="FourYouPetPet" component={FourYouPetPetScreen} options={{ animation: 'slide_from_right' }} />
      <MyPetsStack_Navigator.Screen name="EditFourYouPet" component={EditFourYouPetScreen} options={{ animation: 'slide_from_right' }} />
      <MyPetsStack_Navigator.Screen name="FourYouPetCard" component={FourYouPetCardScreen} options={{ animation: 'fade_from_bottom' }} />
      <MyPetsStack_Navigator.Screen name="Vaccines" component={VaccinesScreen} options={{ animation: 'slide_from_right' }} />
      <MyPetsStack_Navigator.Screen name="Prontuario" component={ProntuarioScreen} options={{ animation: 'slide_from_right' }} />
      <MyPetsStack_Navigator.Screen name="Pesos" component={PesosScreen} options={{ animation: 'slide_from_right' }} />
    </MyPetsStack_Navigator.Navigator>
  );
}

/**
 * ProfileStack — stack interno da aba "Perfil".
 * Gerencia as telas de configuração e dados do usuário.
 */
function ProfileStack() {
  return (
    <ProfileStack_Navigator.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 300,
      }}
    >
      <ProfileStack_Navigator.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack_Navigator.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack_Navigator.Screen name="ManageAddresses" component={ManageAddressesScreen} />
      <ProfileStack_Navigator.Screen name="Notifications" component={NotificationsScreen} />
      <ProfileStack_Navigator.Screen name="Privacy" component={PrivacyScreen} />
      <ProfileStack_Navigator.Screen name="Help" component={HelpScreen} />
      {/* Tela para vincular manualmente a conta do 4YouPet ao e-Pet */}
      <ProfileStack_Navigator.Screen name="Link4YouPet" component={Link4YouPetScreen} />
    </ProfileStack_Navigator.Navigator>
  );
}

/**
 * MainTabs — barra de navegação inferior com 3 abas.
 * Estilo adaptado para iOS (tab bar flutuante com sombra) e Android.
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        // Define o ícone de cada aba conforme o nome da rota e o estado (ativo/inativo)
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyPetsTab') {
            iconName = focused ? 'paw' : 'paw-outline';
          } else if (route.name === 'SearchTab') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          // iOS usa tamanho fixo maior para melhor visibilidade
          return <Ionicons name={iconName} size={Platform.OS === 'ios' ? 28 : size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: Platform.OS === 'ios' ? {
          backgroundColor: 'rgba(255,255,255,0.98)',
          borderTopWidth: 1,
          borderTopColor: 'rgba(0,0,0,0.08)',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 90,
          paddingTop: 12,
          paddingBottom: 28,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
        } : {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          height: 80,
          paddingTop: 10,
          paddingBottom: 20,
        },
        tabBarLabelStyle: Platform.OS === 'ios' ? {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
        } : {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardStack}
        options={{ tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="MyPetsTab"
        component={MyPetsStack}
        options={{ tabBarLabel: 'Meus Pets' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ tabBarLabel: 'Buscar' }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{ tabBarLabel: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user, loading } = useAuth();
  // Indica se o usuário já tem ao menos um endereço cadastrado (ou pulou o onboarding)
  const [hasAddress, setHasAddress] = useState<boolean | null>(null);
  // Controla o estado de verificação de endereço para evitar flash de tela
  const [checkingAddress, setCheckingAddress] = useState(true);

  // Toda vez que o estado de autenticação mudar, verifica o endereço do usuário
  useEffect(() => {
    if (user) {
      checkUserAddress();
    } else {
      // Usuário deslogado — não precisa verificar endereço
      setCheckingAddress(false);
    }
  }, [user]);

  /**
   * checkUserAddress — verifica se o usuário precisa passar pelo onboarding de endereço.
   *
   * Lógica:
   *  1. Se o usuário marcou "pular" no onboarding (AsyncStorage), considera que tem endereço.
   *  2. Caso contrário, consulta a subcoleção 'addresses' do usuário no Firestore.
   *  3. Se tiver pelo menos um endereço → vai direto para o app.
   *  4. Caso contrário → exibe o AddressOnboarding.
   */
  const checkUserAddress = async () => {
    if (!user) return;

    setCheckingAddress(true);
    try {
      const skipped = await AsyncStorage.getItem(`address_onboarding_skipped_${user.uid}`);
      if (skipped === 'true') {
        setHasAddress(true);
        return;
      }

      const addressesRef = collection(firestore, 'users', user.uid, 'addresses');
      const snapshot = await getDocs(query(addressesRef, where('user_id', '==', user.uid)));
      setHasAddress(!snapshot.empty);
    } catch (error) {
      console.error('Error checking address:', error);
      setHasAddress(false);
    } finally {
      setCheckingAddress(false);
    }
  };

  // Chamado pelo AddressOnboarding quando o endereço é salvo ou pulado
  const onAddressSaved = () => {
    setHasAddress(true);
  };

  // Aguarda o carregamento da sessão e da verificação de endereço antes de renderizar
  // Retorna null para evitar flash de tela incorreta durante a inicialização
  if (loading || checkingAddress || (user && hasAddress === null)) {
    return null;
  }

  return (
    <NavigationContainer>
      {user ? (
        // Usuário autenticado: vai para o app principal ou para o onboarding de endereço
        hasAddress ? <MainTabs /> : <AddressOnboarding onComplete={onAddressSaved} />
      ) : (
        // Usuário não autenticado: exibe o fluxo de login/cadastro
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

/**
 * AddressOnboarding — wrapper que exibe a tela de cadastro de endereço
 * como um stack isolado (sem tab bar), passando o callback `onComplete`
 * para que a tela possa sinalizar quando o fluxo terminar.
 */
function AddressOnboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddAddress">
        {(props) => <AddAddressScreen {...props} onComplete={onComplete} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
