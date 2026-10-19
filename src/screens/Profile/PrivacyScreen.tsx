/**
 * PrivacyScreen — configurações de privacidade do usuário.
 *
 * Controla visibilidade de dados pessoais (e-mail, telefone, endereço),
 * analíticos e personalização. As preferências são salvas no AsyncStorage.
 * Também permite solicitar a exclusão de dados via e-mail.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Linking,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
};

/** Chave no AsyncStorage onde as preferências de privacidade são persistidas */
const PRIVACY_KEY = '@e_pet_privacy';

type PrivacySettings = {
  shareProfile: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  analytics: boolean;
  personalization: boolean;
};

/** Item de preferência de privacidade com switch */
function PrivacyItem({
  icon,
  title,
  description,
  value,
  onToggle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.settingItem}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray300, true: colors.secondary }}
        thumbColor={value ? colors.primary : colors.gray500}
      />
    </View>
  );
}

export default function PrivacyScreen({ navigation }: Props) {
  const [settings, setSettings] = useState<PrivacySettings>({
    shareProfile: false, // permitir que outros usuários vejam o perfil
    showEmail: false, // exibir e-mail para outros
    showPhone: true, // exibir telefone para outros
    showAddress: true, // exibir endereço para outros
    analytics: true, // enviar dados de uso anônimos
    personalization: true, // personalização de conteúdo
  });

  /** Carrega as preferências de privacidade salvas no AsyncStorage */
  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(PRIVACY_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /** Persiste as novas preferências no AsyncStorage e atualiza o estado */
  const saveSettings = async (newSettings: PrivacySettings) => {
    try {
      await AsyncStorage.setItem(PRIVACY_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  /** Alterna uma preferência de privacidade */
  const toggleSetting = (key: keyof PrivacySettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  /** Solicita exclusão permanente dos dados do usuário via e-mail de suporte */
  const handleDeleteData = () => {
    Alert.alert(
      'Excluir Meus Dados',
      'Esta ação irá solicitar a exclusão permanente de todos os seus dados. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar Exclusão',
          style: 'destructive',
          onPress: () =>
            Linking.openURL(
              'mailto:support.epet@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Exclus%C3%A3o%20de%20Dados&body=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20a%20exclus%C3%A3o%20permanente%20da%20minha%20conta%20e%20de%20todos%20os%20meus%20dados%20no%20aplicativo%20e-Pet.',
            ).catch(() => Alert.alert('Erro', 'Não foi possível abrir o aplicativo de e-mail.')),
        },
      ],
    );
  };

  const handleDownloadData = () => {
    Alert.alert(
      'Baixar Meus Dados',
      'Você será redirecionado para enviar um e-mail solicitando uma cópia dos seus dados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar Download',
          onPress: () =>
            Linking.openURL(
              'mailto:support.epet@gmail.com?subject=Solicita%C3%A7%C3%A3o%20de%20Download%20de%20Dados&body=Ol%C3%A1%2C%20gostaria%20de%20receber%20uma%20c%C3%B3pia%20de%20todos%20os%20meus%20dados%20cadastrados%20no%20aplicativo%20e-Pet.',
            ).catch(() => Alert.alert('Erro', 'Não foi possível abrir o aplicativo de e-mail.')),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacidade</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Visibilidade do Perfil */}
        <Text style={styles.sectionTitle}>Visibilidade do Perfil</Text>
        <View style={styles.section}>
          <PrivacyItem
            icon="globe-outline"
            title="Perfil Público"
            description="Permitir que outros vejam seu perfil"
            value={settings.shareProfile}
            onToggle={() => toggleSetting('shareProfile')}
          />
          <PrivacyItem
            icon="mail-outline"
            title="Mostrar E-mail"
            description="Exibir e-mail na carteira do pet"
            value={settings.showEmail}
            onToggle={() => toggleSetting('showEmail')}
          />
          <PrivacyItem
            icon="call-outline"
            title="Mostrar Telefone"
            description="Exibir telefone na carteira do pet"
            value={settings.showPhone}
            onToggle={() => toggleSetting('showPhone')}
          />
          <PrivacyItem
            icon="location-outline"
            title="Mostrar Endereço"
            description="Exibir endereço na carteira do pet"
            value={settings.showAddress}
            onToggle={() => toggleSetting('showAddress')}
          />
        </View>

        {/* Dados e Análise */}
        <Text style={styles.sectionTitle}>Dados e Análise</Text>
        <View style={styles.section}>
          <PrivacyItem
            icon="analytics-outline"
            title="Análise de Uso"
            description="Ajude-nos a melhorar o app"
            value={settings.analytics}
            onToggle={() => toggleSetting('analytics')}
          />
          <PrivacyItem
            icon="sparkles-outline"
            title="Personalização"
            description="Experiência personalizada para você"
            value={settings.personalization}
            onToggle={() => toggleSetting('personalization')}
          />
        </View>

        {/* Gerenciar Dados */}
        <Text style={styles.sectionTitle}>Gerenciar Meus Dados</Text>
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionItem} onPress={handleDownloadData}>
            <View style={styles.settingIcon}>
              <Ionicons name="download-outline" size={22} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Baixar Meus Dados</Text>
              <Text style={styles.settingDescription}>Receba uma cópia de todos os seus dados</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleDeleteData}>
            <View style={[styles.settingIcon, styles.dangerIcon]}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, styles.dangerText]}>Excluir Meus Dados</Text>
              <Text style={styles.settingDescription}>Solicitar exclusão permanente da conta</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.gray400} />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          <Text style={styles.infoText}>
            Seus dados são protegidos e nunca compartilhados com terceiros sem sua autorização.
          </Text>
        </View>

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: colors.primary,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerIcon: {
    backgroundColor: '#FEF2F2',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  settingDescription: {
    fontSize: 13,
    color: colors.gray500,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.gray700,
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
});
