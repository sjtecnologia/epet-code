/**
 * Tipos de parâmetros de navegação para cada stack/tab do app.
 *
 * O React Navigation usa esses tipos para garantir que os parâmetros
 * passados entre telas sejam verificados em tempo de compilação.
 * Cada propriedade representa uma rota; o valor é o tipo dos parâmetros
 * esperados (undefined = nenhum parâmetro).
 */
import { Pet, FourYouPet } from './database.types';

/** Stack de autenticação — telas visíveis antes do login */
export type RootStackParamList = {
  Login: undefined;     // Tela de login
  Register: undefined;  // Tela de cadastro
  AddAddress: undefined; // Tela de onboarding de endereço (pós-cadastro)
  MainTabs: undefined;  // App principal (após autenticado)
};

/** Stack do Dashboard (aba Início) — gerenciamento de pets */
export type DashboardStackParamList = {
  Dashboard: undefined;                 // Tela Início
  NewPet: undefined;                    // Formulário de cadastro de novo pet
  PetCard: { pet: Pet };                // Carteira digital de um pet do e-Pet
  EditPet: { pet: Pet };                // Edição de um pet do e-Pet
  FourYouPetPet: { pet: FourYouPet };   // Detalhes de um pet do 4YouPet
  EditFourYouPet: { pet: FourYouPet };  // Edição de um pet do 4YouPet
  FourYouPetCard: { pet: FourYouPet };  // Carteira digital de um pet do 4YouPet
  Vaccines: { pet: Pet };               // Gerenciamento de vacinas de um pet
  Prontuario: { pet: Pet };             // Prontuário médico do pet
  Pesos: { pet: Pet };                  // Controle de peso do pet
};

/** Stack da aba Meus Pets */
export type MyPetsStackParamList = {
  MyPetsList: undefined;                // Lista de todos os pets
  NewPet: undefined;
  PetCard: { pet: Pet };
  EditPet: { pet: Pet };
  FourYouPetPet: { pet: FourYouPet };
  EditFourYouPet: { pet: FourYouPet };
  FourYouPetCard: { pet: FourYouPet };
  Vaccines: { pet: Pet };
  Prontuario: { pet: Pet };
  Pesos: { pet: Pet };
};

/** Stack do Perfil (aba Perfil) — configurações e dados do usuário */
export type ProfileStackParamList = {
  ProfileMain: undefined;      // Tela principal do perfil
  EditProfile: undefined;      // Edição de nome, telefone e foto
  ManageAddresses: undefined;  // Gerenciamento de endereços salvos
  Notifications: undefined;    // Preferências de notificação
  Privacy: undefined;          // Configurações de privacidade
  Help: undefined;             // FAQ e ajuda
  Link4YouPet: undefined;      // Vinculação com conta do 4YouPet
};

/** Stack da aba Buscar */
export type SearchStackParamList = {
  Search: undefined; // Busca de pets por ID ou QR Code
};

/** Tabs da barra de navegação inferior */
export type MainTabsParamList = {
  HomeTab: undefined;    // Aba Início (DashboardStack)
  MyPetsTab: undefined;  // Aba Meus Pets (MyPetsStack)
  SearchTab: undefined;  // Aba Buscar (SearchScreen)
  ProfileTab: undefined; // Aba Perfil (ProfileStack)
};
