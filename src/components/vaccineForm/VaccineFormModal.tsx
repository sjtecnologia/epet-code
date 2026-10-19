/**
 * VaccineFormModal — modal de cadastro/edição de vacina compartilhado.
 *
 * Usado por NewPetScreen (vacinas iniciais do pet) e VaccinesScreen
 * (adicionar/editar na subcoleção do Firestore). O dropdown de vacinas
 * comuns é estado interno; o formulário é controlado pela tela pai
 * (props value/onChange/onSave), que também é responsável por validar
 * e persistir.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { COMMON_VACCINES, maskDateInput, isValidDateBR } from '../../lib/petForm';
import type { VaccineFormData } from '../../lib/vaccines';

type Props = {
  visible: boolean;
  title: string;
  value: VaccineFormData;
  onChange: (next: VaccineFormData) => void;
  onClose: () => void;
  /** Chamado ao pressionar o botão de salvar (a tela valida e persiste) */
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  /** Exibe os campos extras de lote e observações (VaccinesScreen) */
  showExtraFields?: boolean;
  /** Exibe o ícone de validade ao lado da data de aplicação */
  showDateValidityIcon?: boolean;
  /** Se definido, exibe um botão de cancelar ao lado do salvar */
  cancelLabel?: string;
};

export function VaccineFormModal({
  visible,
  title,
  value,
  onChange,
  onClose,
  onSave,
  saving = false,
  saveLabel = 'Adicionar vacina',
  showExtraFields = false,
  showDateValidityIcon = false,
  cancelLabel,
}: Props) {
  const [showCommonVaccines, setShowCommonVaccines] = useState(false);

  // Fecha a lista de vacinas comuns ao esconder o modal
  useEffect(() => {
    if (!visible) setShowCommonVaccines(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.gray600} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {/* Nome da vacina */}
            <Text style={styles.inputLabel}>Nome da vacina *</Text>
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowCommonVaccines(!showCommonVaccines)}
              activeOpacity={1}
            >
              <Ionicons
                name="medical-outline"
                size={20}
                color={colors.gray500}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Ex: V8, Antirrábica..."
                placeholderTextColor={colors.gray400}
                value={value.name}
                onChangeText={(v) => onChange({ ...value, name: v })}
                onFocus={() => setShowCommonVaccines(true)}
              />
              <TouchableOpacity onPress={() => setShowCommonVaccines(!showCommonVaccines)}>
                <Ionicons
                  name={showCommonVaccines ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.gray500}
                />
              </TouchableOpacity>
            </TouchableOpacity>

            {showCommonVaccines && (
              <View style={styles.commonVaccinesList}>
                {COMMON_VACCINES.map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.commonVaccineItem,
                      value.name === v && styles.commonVaccineItemSelected,
                    ]}
                    onPress={() => {
                      onChange({ ...value, name: v === 'Outra' ? '' : v });
                      setShowCommonVaccines(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.commonVaccineText,
                        value.name === v && styles.commonVaccineTextSelected,
                      ]}
                    >
                      {v}
                    </Text>
                    {value.name === v && (
                      <Ionicons name="checkmark" size={16} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Data de aplicação */}
            <Text style={styles.inputLabel}>Data de aplicação *</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.gray500}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={colors.gray400}
                value={value.date_applied}
                onChangeText={(v) => onChange({ ...value, date_applied: maskDateInput(v) })}
                keyboardType="numeric"
                maxLength={10}
              />
              {showDateValidityIcon && value.date_applied.length === 10 && (
                <Ionicons
                  name={isValidDateBR(value.date_applied) ? 'checkmark-circle' : 'close-circle'}
                  size={20}
                  color={isValidDateBR(value.date_applied) ? '#10B981' : colors.error}
                />
              )}
            </View>

            {/* Próxima dose */}
            <Text style={styles.inputLabel}>
              Próxima dose <Text style={styles.optionalLabel}>(opcional)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colors.gray500}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="dd/mm/aaaa"
                placeholderTextColor={colors.gray400}
                value={value.next_due_date}
                onChangeText={(v) => onChange({ ...value, next_due_date: maskDateInput(v) })}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            {/* Veterinário */}
            <Text style={styles.inputLabel}>
              Veterinário <Text style={styles.optionalLabel}>(opcional)</Text>
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.gray500}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="Nome do veterinário"
                placeholderTextColor={colors.gray400}
                value={value.veterinarian}
                onChangeText={(v) => onChange({ ...value, veterinarian: v })}
              />
            </View>

            {showExtraFields && (
              <>
                {/* Lote */}
                <Text style={styles.inputLabel}>
                  Lote <Text style={styles.optionalLabel}>(opcional)</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="barcode-outline"
                    size={20}
                    color={colors.gray500}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Número do lote"
                    placeholderTextColor={colors.gray400}
                    value={value.batch}
                    onChangeText={(v) => onChange({ ...value, batch: v })}
                    autoCapitalize="characters"
                  />
                </View>

                {/* Observações */}
                <Text style={styles.inputLabel}>
                  Observações <Text style={styles.optionalLabel}>(opcional)</Text>
                </Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Reações, observações do veterinário..."
                    placeholderTextColor={colors.gray400}
                    value={value.notes}
                    onChangeText={(v) => onChange({ ...value, notes: v })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}

            <View style={styles.buttonsRow}>
              {cancelLabel && (
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  saving && styles.saveButtonDisabled,
                  cancelLabel && styles.saveButtonFlex,
                ]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name={cancelLabel ? 'add-circle' : 'checkmark'}
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.saveButtonText}>{saveLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray700,
    marginBottom: 6,
    marginTop: 8,
  },
  optionalLabel: {
    fontWeight: '400',
    color: colors.gray500,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
    minHeight: 52,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    minHeight: 90,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  textArea: {
    minHeight: 70,
    paddingTop: 0,
  },
  commonVaccinesList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray300,
    marginBottom: 8,
    overflow: 'hidden',
  },
  commonVaccineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  commonVaccineItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  commonVaccineText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  commonVaccineTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray700,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonFlex: {
    flex: 1,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
