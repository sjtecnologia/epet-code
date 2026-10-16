/**
 * EditFourYouPetScreen — permite editar os dados básicos de um pet do 4YouPet.
 *
 * Atualiza o documento correspondente na coleção 'pet' do Firestore com
 * nome, raça, porte, cor, status de castração e data de nascimento.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { FourYouPet } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import { toDate } from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'EditFourYouPet'>;
  route: RouteProp<DashboardStackParamList, 'EditFourYouPet'>;
};

/** Converte um Firestore Timestamp, Date ou string em um objeto Date */
const parseBirthToDate = (birth: unknown): Date => toDate(birth) ?? new Date();

/** Formata um objeto Date para exibição no padrão DD/MM/AAAA */
const formatDateForDisplay = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Calcula a idade a partir de um objeto Date e retorna texto legfível */
const calculateAge = (date: Date): string => {
  const today = new Date();
  let years = today.getFullYear() - date.getFullYear();
  let months = today.getMonth() - date.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`;
  if (months > 0) return `${months} mês${months > 1 ? 'es' : ''}`;
  return 'Filhote';
};

export default function EditFourYouPetScreen({ navigation, route }: Props) {
  const { pet } = route.params;               // dados atuais do pet 4YouPet
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [birthDate, setBirthDate] = useState<Date>(parseBirthToDate(pet.birth)); // data de nascimento
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Campos editáveis do pet
  const [formData, setFormData] = useState({
    name: pet.name || '',
    breed: pet.breed || '',
    size: pet.size || '',
    color: pet.color || '',
    castrado: pet.castrado ?? false,
  });

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate && event.type !== 'dismissed') {
        setBirthDate(selectedDate);
      }
    } else {
      if (selectedDate) {
        setBirthDate(selectedDate);
      }
    }
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Campo obrigatório', 'O nome do pet é obrigatório.');
      return;
    }

    setLoading(true);
    try {
      const petRef = doc(firestore, 'pet', pet.id);
      await updateDoc(petRef, {
        name: formData.name.trim(),
        breed: formData.breed.trim() || null,
        birth: Timestamp.fromDate(birthDate),
        size: formData.size.trim() || null,
        color: formData.color.trim() || null,
        castrado: formData.castrado,
      });

      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível atualizar o pet. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Pet 4YouPet</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Pet ID (Não editável) */}
        <View style={styles.petIdContainer}>
          <Ionicons name="id-card" size={18} color={colors.primary} />
          <Text style={styles.petIdLabel}>ID do Pet:</Text>
          <Text style={styles.petIdValue} numberOfLines={1}>{pet.pet_id || pet.id}</Text>
        </View>

        {/* Dados do Pet */}
        <Text style={styles.sectionTitle}>Dados do Pet</Text>
        <View style={styles.inputGroup}>
          <View style={styles.inputContainer}>
            <Ionicons name="paw-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome do pet *"
              placeholderTextColor={colors.gray500}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="heart-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Raça"
              placeholderTextColor={colors.gray500}
              value={formData.breed}
              onChangeText={(text) => setFormData({ ...formData, breed: text })}
            />
          </View>

          {/* DatePicker para Data de Nascimento */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.input, styles.dateText, { paddingVertical: 8 }]}>
                {formatDateForDisplay(birthDate)}
              </Text>
              <Text style={styles.ageText}>
                {calculateAge(birthDate)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.gray500} />
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <Ionicons name="resize-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Porte (ex: Pequeno, Médio, Grande)"
              placeholderTextColor={colors.gray500}
              value={formData.size}
              onChangeText={(text) => setFormData({ ...formData, size: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="color-palette-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Cor"
              placeholderTextColor={colors.gray500}
              value={formData.color}
              onChangeText={(text) => setFormData({ ...formData, color: text })}
            />
          </View>
        </View>

        {/* Castrado Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabel}>
            <Ionicons name="cut-outline" size={20} color={colors.gray500} />
            <Text style={styles.toggleText}>Castrado</Text>
          </View>
          <Switch
            value={formData.castrado}
            onValueChange={(value) => setFormData({ ...formData, castrado: value })}
            trackColor={{ false: colors.gray300, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* DatePicker Modal para iOS */}
        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowDatePicker(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerCancel}>Cancelar</Text>
                  </TouchableOpacity>
                  <Text style={styles.datePickerTitle}>Data de Nascimento</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.datePickerDone}>OK</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={birthDate}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                  locale="pt-BR"
                />
              </View>
            </View>
          </Modal>
        )}

        {/* DatePicker para Android */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleUpdate}
          disabled={loading}
        >
          {loading ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.submitButtonText}>Salvando...</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.submitButtonText}>Salvar Alterações</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowSuccessModal(false); navigation.goBack(); }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successModalCard}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" style={{ marginBottom: 12 }} />
            <Text style={styles.successTitle}>Pet atualizado!</Text>
            <Text style={styles.successDescription}>
              As informações do pet foram salvas com sucesso.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => { setShowSuccessModal(false); navigation.goBack(); }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 16,
    backgroundColor: colors.primary,
  },
  backButton: {
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
    padding: 20,
  },
  petIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  petIdLabel: {
    fontSize: 14,
    color: colors.gray500,
    fontWeight: '500',
  },
  petIdValue: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 4,
  },
  inputGroup: {
    gap: 10,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    minHeight: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 14,
  },
  dateText: {
    color: '#1a1a1a',
    fontSize: 15,
  },
  ageText: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: -4,
    marginBottom: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: 24,
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleText: {
    fontSize: 15,
    color: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  datePickerCancel: {
    fontSize: 16,
    color: colors.gray500,
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  datePickerDone: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  successButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
