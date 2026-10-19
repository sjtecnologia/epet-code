/**
 * NotificationsScreen — configurações de notificações do usuário.
 *
 * As preferências são salvas localmente no AsyncStorage com a chave
 * '@e_pet_notifications'. Quando notificações globais são desabilitadas,
 * todas as sub-configurações também são desativadas automaticamente.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
};

/** Chave no AsyncStorage onde as configurações de notificação são persistidas */
const NOTIFICATIONS_KEY = '@e_pet_notifications';

type NotificationSettings = {
  pushEnabled: boolean;
  petUpdates: boolean;
  reminders: boolean;
  marketing: boolean;
  sound: boolean;
  vibration: boolean;
};

/** Item de configuração de notificação com switch */
function NotificationItem({
  icon,
  title,
  description,
  value,
  onToggle,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.settingItem, disabled && styles.settingItemDisabled]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color={disabled ? colors.gray400 : colors.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.settingTitleDisabled]}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray300, true: colors.secondary }}
        thumbColor={value ? colors.primary : colors.gray500}
        disabled={disabled}
      />
    </View>
  );
}

export default function NotificationsScreen({ navigation }: Props) {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true, // habilita/desabilita todas as notificações
    petUpdates: true, // atualizações sobre os pets
    reminders: true, // lembretes de vacinas e consultas
    marketing: false, // novidades e promoções
    sound: true, // som nas notificações
    vibration: true, // vibração nas notificações
  });

  /** Carrega as configurações salvas no AsyncStorage */
  const loadSettings = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
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

  /** Persiste as novas configurações no AsyncStorage e atualiza o estado */
  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  /** Alterna uma configuração específica; desabilitar 'pushEnabled' desativa todas as outras */
  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };

    if (key === 'pushEnabled' && !newSettings.pushEnabled) {
      newSettings.petUpdates = false;
      newSettings.reminders = false;
      newSettings.marketing = false;
    }

    saveSettings(newSettings);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificações</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notificações Gerais */}
        <Text style={styles.sectionTitle}>Geral</Text>
        <View style={styles.section}>
          <NotificationItem
            icon="notifications"
            title="Notificações Push"
            description="Ative para receber notificações"
            value={settings.pushEnabled}
            onToggle={() => toggleSetting('pushEnabled')}
          />
        </View>

        {/* Tipos de Notificação */}
        <Text style={styles.sectionTitle}>Tipos de Notificação</Text>
        <View style={styles.section}>
          <NotificationItem
            icon="paw"
            title="Atualizações do Pet"
            description="Lembretes de vacinas e consultas"
            value={settings.petUpdates}
            onToggle={() => toggleSetting('petUpdates')}
            disabled={!settings.pushEnabled}
          />
          <NotificationItem
            icon="alarm"
            title="Lembretes"
            description="Lembretes personalizados"
            value={settings.reminders}
            onToggle={() => toggleSetting('reminders')}
            disabled={!settings.pushEnabled}
          />
          <NotificationItem
            icon="megaphone"
            title="Novidades e Promoções"
            description="Receba dicas e ofertas"
            value={settings.marketing}
            onToggle={() => toggleSetting('marketing')}
            disabled={!settings.pushEnabled}
          />
        </View>

        {/* Preferências */}
        <Text style={styles.sectionTitle}>Preferências</Text>
        <View style={styles.section}>
          <NotificationItem
            icon="volume-high"
            title="Som"
            description="Tocar som nas notificações"
            value={settings.sound}
            onToggle={() => toggleSetting('sound')}
            disabled={!settings.pushEnabled}
          />
          <NotificationItem
            icon="phone-portrait"
            title="Vibração"
            description="Vibrar ao receber notificações"
            value={settings.vibration}
            onToggle={() => toggleSetting('vibration')}
            disabled={!settings.pushEnabled}
          />
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Você pode alterar as permissões de notificação a qualquer momento nas configurações do
            seu dispositivo.
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
  settingItemDisabled: {
    opacity: 0.6,
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
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingTitleDisabled: {
    color: colors.gray500,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.gray500,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.tertiary,
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
