/**
 * VaccinesScreen — gerenciamento de vacinas de um pet e-Pet.
 *
 * Exibe a lista de vacinas cadastradas com status visual (em dia,
 * vence em breve, vencida, dose única) e permite adicionar, editar
 * e excluir registros. Os dados são persistidos na subcoleção 'pets/{petId}/vaccines'
 * do Firestore.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Vaccine } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import {
  COMMON_VACCINES,
  maskDateInput,
  isValidDateBR,
  parseDateBR,
  formatDateBR,
} from '../../lib/petForm';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'Vaccines'>;
  route: RouteProp<DashboardStackParamList, 'Vaccines'>;
};

/** Possíveis status de uma vacina baseados na data do próximo reforço */
type VaccineStatus = 'up_to_date' | 'upcoming' | 'overdue' | 'no_reapply';

/**
 * getVaccineStatus — calcula o status da vacina com base na data do próximo reforço.
 * - overdue: reforço já venceu
 * - upcoming: vence em até 30 dias
 * - up_to_date: ainda tem mais de 30 dias
 * - no_reapply: sem data de reforço (dose única)
 */
function getVaccineStatus(vaccine: Vaccine): VaccineStatus {
  if (!vaccine.next_due_date) return 'no_reapply';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDue = new Date(vaccine.next_due_date + 'T00:00:00');
  const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 30) return 'upcoming';
  return 'up_to_date';
}

/** Configurações visuais (rótulo, cor e ícone) para cada status de vacina */
const statusConfig: Record<VaccineStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  up_to_date: { label: 'Em dia', color: colors.primary, icon: 'checkmark-circle' },
  upcoming: { label: 'Vence em breve', color: colors.warning, icon: 'time' },
  overdue: { label: 'Vencida', color: colors.error, icon: 'alert-circle' },
  no_reapply: { label: 'Dose única', color: colors.info, icon: 'information-circle' },
};

export default function VaccinesScreen({ navigation, route }: Props) {
  const { pet } = route.params;                         // pet selecionado
  const [vaccines, setVaccines] = useState<Vaccine[]>([]); // lista de vacinas carregadas
  const [loading, setLoading] = useState(true);            // indica carregamento inicial
  const [showModal, setShowModal] = useState(false);       // controla o modal de adicionar/editar
  const [showCommonVaccines, setShowCommonVaccines] = useState(false); // mostra lista de vacinas comuns
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null); // vacina sendo editada (null = nova)
  const [saving, setSaving] = useState(false);             // bloqueia o botão enquanto salva

  // Campos do formulário de vacina
  const emptyForm = {
    name: '',
    date_applied: '',
    next_due_date: '',
    veterinarian: '',
    batch: '',
    notes: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  /** Busca as vacinas do pet na subcoleção Firestore ordenadas da mais recente para a mais antiga */
  const fetchVaccines = useCallback(async () => {
    setLoading(true);
    try {
      const vaccinesRef = collection(firestore, 'pets', pet.id, 'vaccines');
      const snapshot = await getDocs(query(vaccinesRef, orderBy('date_applied', 'desc')));
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vaccine));
      setVaccines(data);
    } catch (err) {
      console.error('Erro ao buscar vacinas:', err);
    } finally {
      setLoading(false);
    }
  }, [pet.id]);

  useEffect(() => {
    fetchVaccines();
  }, [fetchVaccines]);

  /** Abre o modal em modo de adição (formulário vazio) */
  const openAddModal = () => {
    setEditingVaccine(null);
    setFormData(emptyForm);
    setShowCommonVaccines(false);
    setShowModal(true);
  };

  /** Abre o modal em modo de edição, pré-preenchendo o formulário com os dados da vacina */
  const openEditModal = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    setFormData({
      name: vaccine.name,
      date_applied: formatDateBR(vaccine.date_applied),
      next_due_date: vaccine.next_due_date ? formatDateBR(vaccine.next_due_date) : '',
      veterinarian: vaccine.veterinarian || '',
      batch: vaccine.batch || '',
      notes: vaccine.notes || '',
    });
    setShowCommonVaccines(false);
    setShowModal(true);
  };

  /**
   * handleSave — valida e persiste a vacina no Firestore.
   * Se editingVaccine está definido, atualiza o documento existente;
   * caso contrário, insere um novo na subcoleção.
   */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Informe o nome da vacina.');
      return;
    }
    if (!isValidDateBR(formData.date_applied)) {
      Alert.alert('Erro', 'Informe uma data de aplicação válida (dd/mm/aaaa).');
      return;
    }
    if (formData.next_due_date && !isValidDateBR(formData.next_due_date)) {
      Alert.alert('Erro', 'Data do próximo reforço inválida (dd/mm/aaaa).');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        pet_id: pet.id,
        name: formData.name.trim(),
        date_applied: parseDateBR(formData.date_applied),
        next_due_date: formData.next_due_date ? parseDateBR(formData.next_due_date) : null,
        veterinarian: formData.veterinarian.trim() || null,
        batch: formData.batch.trim() || null,
        notes: formData.notes.trim() || null,
      };

      const vaccinesRef = collection(firestore, 'pets', pet.id, 'vaccines');

      if (editingVaccine) {
        await updateDoc(doc(firestore, 'pets', pet.id, 'vaccines', editingVaccine.id), {
          ...payload,
          updated_at: new Date().toISOString(),
        });
      } else {
        await addDoc(vaccinesRef, {
          ...payload,
          created_at: new Date().toISOString(),
        });
      }

      setShowModal(false);
      fetchVaccines();
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  /** Exibe confirmação antes de excluir permanentemente a vacina */
  const handleDelete = (vaccine: Vaccine) => {
    Alert.alert(
      'Excluir vacina',
      `Deseja excluir o registro de "${vaccine.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(firestore, 'pets', pet.id, 'vaccines', vaccine.id));
              fetchVaccines();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a vacina.');
            }
          },
        },
      ]
    );
  };

  // Contagem de vacinas por status (usada nos badges de resumo)
  const counts = {
    up_to_date: vaccines.filter(v => getVaccineStatus(v) === 'up_to_date').length,
    upcoming: vaccines.filter(v => getVaccineStatus(v) === 'upcoming').length,
    overdue: vaccines.filter(v => getVaccineStatus(v) === 'overdue').length,
    no_reapply: vaccines.filter(v => getVaccineStatus(v) === 'no_reapply').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Vacinas</Text>
          <Text style={styles.headerSubtitle}>{pet.name}</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={styles.headerButton}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumo */}
        {vaccines.length > 0 && (
          <View style={styles.summaryRow}>
            {counts.up_to_date > 0 && (
              <View style={[styles.summaryBadge, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[styles.summaryText, { color: colors.primary }]}>
                  {counts.up_to_date} em dia
                </Text>
              </View>
            )}
            {counts.upcoming > 0 && (
              <View style={[styles.summaryBadge, { backgroundColor: '#FEF9C3' }]}>
                <Ionicons name="time" size={14} color={colors.warning} />
                <Text style={[styles.summaryText, { color: colors.warning }]}>
                  {counts.upcoming} vence em breve
                </Text>
              </View>
            )}
            {counts.overdue > 0 && (
              <View style={[styles.summaryBadge, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={[styles.summaryText, { color: colors.error }]}>
                  {counts.overdue} vencida{counts.overdue > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : vaccines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="medical" size={56} color={colors.gray400} />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma vacina registrada</Text>
            <Text style={styles.emptySubtitle}>
              Registre as vacinas de {pet.name} para manter o histórico de saúde em dia.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Adicionar Vacina</Text>
            </TouchableOpacity>
          </View>
        ) : (
          vaccines.map((vaccine) => {
            const status = getVaccineStatus(vaccine);
            const cfg = statusConfig[status];
            return (
              <View key={vaccine.id} style={styles.vaccineCard}>
                <View style={styles.vaccineCardHeader}>
                  <View style={styles.vaccineNameRow}>
                    <View style={[styles.vaccineIconContainer, { backgroundColor: `${cfg.color}20` }]}>
                      <Ionicons name="medical" size={20} color={cfg.color} />
                    </View>
                    <Text style={styles.vaccineName} numberOfLines={2}>{vaccine.name}</Text>
                  </View>
                  <View style={styles.vaccineActions}>
                    <TouchableOpacity onPress={() => openEditModal(vaccine)} style={styles.actionBtn}>
                      <Ionicons name="create-outline" size={20} color={colors.gray600} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(vaccine)} style={styles.actionBtn}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.vaccineInfoGrid}>
                  <View style={styles.vaccineInfoItem}>
                    <Text style={styles.vaccineInfoLabel}>Aplicada em</Text>
                    <Text style={styles.vaccineInfoValue}>{formatDateBR(vaccine.date_applied)}</Text>
                  </View>
                  {vaccine.next_due_date && (
                    <View style={styles.vaccineInfoItem}>
                      <Text style={styles.vaccineInfoLabel}>Próximo reforço</Text>
                      <Text style={[styles.vaccineInfoValue, status === 'overdue' && { color: colors.error }, status === 'upcoming' && { color: colors.warning }]}>
                        {formatDateBR(vaccine.next_due_date)}
                      </Text>
                    </View>
                  )}
                  {vaccine.veterinarian && (
                    <View style={styles.vaccineInfoItem}>
                      <Text style={styles.vaccineInfoLabel}>Veterinário(a)</Text>
                      <Text style={styles.vaccineInfoValue}>{vaccine.veterinarian}</Text>
                    </View>
                  )}
                  {vaccine.batch && (
                    <View style={styles.vaccineInfoItem}>
                      <Text style={styles.vaccineInfoLabel}>Lote</Text>
                      <Text style={styles.vaccineInfoValue}>{vaccine.batch}</Text>
                    </View>
                  )}
                </View>

                {vaccine.notes ? (
                  <Text style={styles.vaccineNotes}>{vaccine.notes}</Text>
                ) : null}

                <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}15` }]}>
                  <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal Adicionar / Editar */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingVaccine ? 'Editar Vacina' : 'Nova Vacina'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Nome da vacina */}
              <Text style={styles.inputLabel}>Nome da vacina *</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowCommonVaccines(!showCommonVaccines)}
                activeOpacity={1}
              >
                <Ionicons name="medical-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Ex: V8, Antirrábica..."
                  placeholderTextColor={colors.gray400}
                  value={formData.name}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, name: v }))}
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
                      style={styles.commonVaccineItem}
                      onPress={() => {
                        setFormData(prev => ({ ...prev, name: v === 'Outra' ? '' : v }));
                        setShowCommonVaccines(false);
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                      <Text style={styles.commonVaccineText}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Data de aplicação */}
              <Text style={styles.inputLabel}>Data de aplicação *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="dd/mm/aaaa"
                  placeholderTextColor={colors.gray400}
                  value={formData.date_applied}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, date_applied: maskDateInput(v) }))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Próximo reforço */}
              <Text style={styles.inputLabel}>Próximo reforço</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="refresh-circle-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="dd/mm/aaaa (opcional)"
                  placeholderTextColor={colors.gray400}
                  value={formData.next_due_date}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, next_due_date: maskDateInput(v) }))}
                  keyboardType="numeric"
                  maxLength={10}
                />
              </View>

              {/* Veterinário */}
              <Text style={styles.inputLabel}>Veterinário(a)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nome do veterinário (opcional)"
                  placeholderTextColor={colors.gray400}
                  value={formData.veterinarian}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, veterinarian: v }))}
                />
              </View>

              {/* Lote */}
              <Text style={styles.inputLabel}>Lote</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="barcode-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Número do lote (opcional)"
                  placeholderTextColor={colors.gray400}
                  value={formData.batch}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, batch: v }))}
                  autoCapitalize="characters"
                />
              </View>

              {/* Observações */}
              <Text style={styles.inputLabel}>Observações</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Reações, observações do veterinário... (opcional)"
                  placeholderTextColor={colors.gray400}
                  value={formData.notes}
                  onChangeText={(v) => setFormData(prev => ({ ...prev, notes: v }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>
                      {editingVaccine ? 'Salvar alterações' : 'Adicionar vacina'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  vaccineCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  vaccineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vaccineNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  vaccineIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  vaccineName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  vaccineActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaccineInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  vaccineInfoItem: {
    minWidth: '45%',
    flex: 1,
  },
  vaccineInfoLabel: {
    fontSize: 11,
    color: colors.gray500,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  vaccineInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  vaccineNotes: {
    fontSize: 13,
    color: colors.gray600,
    fontStyle: 'italic',
    marginBottom: 10,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  commonVaccineText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
