/**
 * ProfileScreen — tela principal do perfil do usuário.
 *
 * Exibe avatar, nome, e-mail, contagem de pets cadastrados
 * e um menu de navegação para as configurações da conta.
 * Recarrega os dados sempre que a tela entra em foco.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { UserDoc } from '../../types/database.types';
import { ProfileStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

/** Item do menu de configurações exibido na tela do perfil */
type ProfileMenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  route: keyof ProfileStackParamList;
  color: string;
  bg: string;
};

const profileMenuItems: ProfileMenuItem[] = [
  { icon: 'person-outline', label: 'Editar Perfil', sub: 'Alterar nome e informações', route: 'EditProfile', color: colors.primary, bg: colors.tertiary },
  { icon: 'location-outline', label: 'Meus Endereços', sub: 'Gerenciar endereços salvos', route: 'ManageAddresses', color: colors.primary, bg: colors.tertiary },
  { icon: 'notifications-outline', label: 'Notificações', sub: 'Configurar alertas', route: 'Notifications', color: colors.primary, bg: colors.tertiary },
  { icon: 'shield-outline', label: 'Privacidade', sub: 'Controle seus dados', route: 'Privacy', color: colors.primary, bg: colors.tertiary },
  { icon: 'help-circle-outline', label: 'Ajuda', sub: 'Suporte e FAQ', route: 'Help', color: colors.primary, bg: colors.tertiary },
  { icon: 'link', label: 'Vincular 4YouPet', sub: 'Importar pets e vacinas do 4YouPet', route: 'Link4YouPet', color: '#ff6b35', bg: '#fff3e0' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, signOut } = useAuth();

  // Dados exibidos no cabeçalho do perfil
  const [profileData, setProfileData] = useState({
    name: '',
    email: user?.email || '',
    avatar_url: null as string | null,
  });
  const [petsCount, setPetsCount] = useState(0); // total de pets e-Pet do usuário

  // Recarrega perfil e contagem toda vez que a tela ganha foco
  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
      fetchPetsCount();
    }, [])
  );

  /** Busca nome e avatar do usuário no Firestore */
  const fetchProfile = async () => {
    if (!user) return;

    try {
      const snap = await getDoc(doc(firestore, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data() as UserDoc;
        setProfileData({
          name: data.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          avatar_url: data.avatar_url || null,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar perfil:', err);
    }
  };

  /** Conta quantos pets e-Pet o usuário possui */
  const fetchPetsCount = async () => {
    if (!user) return;

    try {
      const petsRef = collection(firestore, 'pets');
      const snap = await getCountFromServer(query(petsRef, where('user_id', '==', user.uid)));
      setPetsCount(snap.data().count);
    } catch (err) {
      console.error('Erro ao contar pets:', err);
    }
  };

  /** Exibe confirmação antes de encerrar a sessão */
  const handleSignOut = () => {
    Alert.alert('Sair', 'Tem certeza que deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header: iOS usa SafeAreaView com fundo verde, Android mantém View simples */}
      {Platform.OS === 'ios' ? (
        <SafeAreaView style={styles.headerIOS}>
          <Text style={styles.headerTitleIOS}>Perfil</Text>
          <View style={styles.avatarContainer}>
            {profileData.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatarIOS} />
            ) : (
              <View style={styles.avatarPlaceholderIOS}>
                <Ionicons name="person" size={44} color="rgba(255,255,255,0.7)" />
              </View>
            )}
          </View>
          <Text style={styles.userNameIOS}>{profileData.name}</Text>
          <Text style={styles.userEmailIOS}>{profileData.email}</Text>
        </SafeAreaView>
      ) : (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.avatarContainer}>
            {profileData.avatar_url ? (
              <Image source={{ uri: profileData.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.gray500} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>{profileData.name}</Text>
          <Text style={styles.userEmail}>{profileData.email}</Text>
        </View>
      )}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      >
        {/* Stats Card */}
        <View style={Platform.OS === 'ios' ? styles.statsCardIOS : styles.statsCard}>
          <View style={styles.statItem}>
            <View style={styles.statIcon}>
              <Ionicons name="paw" size={24} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{petsCount}</Text>
            <Text style={styles.statLabel}>Pets Cadastrados</Text>
          </View>
        </View>

        {/* Menu Options */}
        {Platform.OS === 'ios' ? (
          /* iOS: lista agrupada com separadores inset e cantos arredondados */
          <View style={styles.menuSectionIOS}>
            {profileMenuItems.map((item, index, arr) => (
              <TouchableOpacity
                key={item.route}
                style={[styles.menuItemIOS, index < arr.length - 1 && styles.menuItemIOSSeparator]}
                onPress={() => navigation.navigate(item.route)}
                activeOpacity={0.6}
              >
                <View style={[styles.menuIconContainerIOS, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTextIOS}>{item.label}</Text>
                  <Text style={styles.menuSubtextIOS}>{item.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.gray300} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          /* Android: lista original */
          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('EditProfile')}>
              <View style={styles.menuIconContainer}><Ionicons name="person-outline" size={22} color={colors.primary} /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Editar Perfil</Text><Text style={styles.menuSubtext}>Alterar nome e informações</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ManageAddresses')}>
              <View style={styles.menuIconContainer}><Ionicons name="location-outline" size={22} color={colors.primary} /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Meus Endereços</Text><Text style={styles.menuSubtext}>Gerenciar endereços salvos</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
              <View style={styles.menuIconContainer}><Ionicons name="notifications-outline" size={22} color={colors.primary} /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Notificações</Text><Text style={styles.menuSubtext}>Configurar alertas</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Privacy')}>
              <View style={styles.menuIconContainer}><Ionicons name="shield-outline" size={22} color={colors.primary} /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Privacidade</Text><Text style={styles.menuSubtext}>Controle seus dados</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Help')}>
              <View style={styles.menuIconContainer}><Ionicons name="help-circle-outline" size={22} color={colors.primary} /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Ajuda</Text><Text style={styles.menuSubtext}>Suporte e FAQ</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Link4YouPet')}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#fff3e0' }]}><Ionicons name="link" size={22} color="#ff6b35" /></View>
              <View style={styles.menuContent}><Text style={styles.menuText}>Vincular 4YouPet</Text><Text style={styles.menuSubtext}>Importar pets e vacinas do 4YouPet</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity
          style={Platform.OS === 'ios' ? styles.logoutButtonIOS : styles.logoutButton}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  content: {
    flex: 1,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  statsCard: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: colors.gray600,
  },
  menuSection: {
    marginHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  menuSubtext: {
    fontSize: 13,
    color: colors.gray500,
    marginTop: 2,
  },
  logoutButton: {
    marginHorizontal: 24,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutButtonIOS: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  bottomPadding: {
    height: 100,
  },
  // ─── Estilos exclusivos iOS ───────────────────────────────────────────────
  headerIOS: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  headerTitleIOS: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  avatarIOS: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  avatarPlaceholderIOS: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  userNameIOS: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  userEmailIOS: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: -0.1,
  },
  statsCardIOS: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  menuSectionIOS: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  menuItemIOS: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemIOSSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray200,
  },
  menuIconContainerIOS: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTextIOS: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textPrimary,
    letterSpacing: -0.1,
  },
  menuSubtextIOS: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 1,
  },
});
