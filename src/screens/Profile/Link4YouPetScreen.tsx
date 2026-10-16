/**
 * Link4YouPetScreen — informações sobre a integração automática e-Pet ↔ 4YouPet.
 *
 * Com o Firebase Auth unificado, não é mais necessário vincular contas manualmente.
 * A mesma conta (e-mail/senha) funciona em ambos os aplicativos.
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '../../types/navigation.types';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<ProfileStackParamList>;
};

export default function Link4YouPetScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>4YouPet</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="link" size={48} color={colors.primary} />
        </View>

        <Text style={styles.title}>Integração Automática</Text>
        <Text style={styles.subtitle}>
          Sua conta e-Pet e 4YouPet são a mesma conta! Ao criar seu perfil no e-Pet, você já tem acesso automático ao 4YouPet com o mesmo e-mail e senha.
        </Text>

        <View style={styles.card}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Login unificado</Text>
            <Text style={styles.cardDesc}>Use o mesmo e-mail e senha em ambos os apps.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Ionicons name="sync" size={24} color={colors.primary} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Pets sincronizados</Text>
            <Text style={styles.cardDesc}>Os pets cadastrados no e-Pet aparecem automaticamente no 4YouPet.</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Não é necessário nenhuma vinculação manual. Seus dados já estão integrados!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  content: { flex: 1 },
  contentContainer: { padding: 24 },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.gray600, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  cardDesc: { fontSize: 13, color: colors.gray600 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: colors.gray700, lineHeight: 18 },
});
