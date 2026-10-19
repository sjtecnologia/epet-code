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
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { Vaccine } from '../../types/database.types';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';
import { parseDateBR, formatDateBR } from '../../lib/petForm';
import {
  getVaccineStatus,
  statusConfig,
  countVaccinesByStatus,
  validateVaccineForm,
} from '../../lib/vaccines';
import { VaccineFormModal } from '../../components/vaccineForm/VaccineFormModal';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'Vaccines'>;
  route: RouteProp<DashboardStackParamList, 'Vaccines'>;
};

export default function VaccinesScreen({ navigation, route }: Props) {
  const { pet } = route.params; // pet selecionado
  const [vaccines, setVaccines] = useState<Vaccine[]>([]); // lista de vacinas carregadas
  const [loading, setLoading] = useState(true); // indica carregamento inicial
  const [showModal, setShowModal] = useState(false); // controla o modal de adicionar/editar
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null); // vacina sendo editada (null = nova)
  const [saving, setSaving] = useState(false); // bloqueia o botão enquanto salva

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
    try {
      const vaccinesRef = collection(firestore, 'pets', pet.id, 'vaccines');
      const snapshot = await getDocs(query(vaccinesRef, orderBy('date_applied', 'desc')));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Vaccine);
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
    setShowModal(true);
  };

  /**
   * handleSave — valida e persiste a vacina no Firestore.
   * Se editingVaccine está definido, atualiza o documento existente;
   * caso contrário, insere um novo na subcoleção.
   */
  const handleSave = async () => {
    const validationError = validateVaccineForm(formData);
    if (validationError) {
      Alert.alert('Erro', validationError);
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
    Alert.alert('Excluir vacina', `Deseja excluir o registro de "${vaccine.name}"?`, [
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
    ]);
  };

  // Contagem de vacinas por status (usada nos badges de resumo)
  const counts = countVaccinesByStatus(vaccines);

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
                    <View
                      style={[styles.vaccineIconContainer, { backgroundColor: `${cfg.color}20` }]}
                    >
                      <Ionicons name="medical" size={20} color={cfg.color} />
                    </View>
                    <Text style={styles.vaccineName} numberOfLines={2}>
                      {vaccine.name}
                    </Text>
                  </View>
                  <View style={styles.vaccineActions}>
                    <TouchableOpacity
                      onPress={() => openEditModal(vaccine)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.gray600} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(vaccine)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.vaccineInfoGrid}>
                  <View style={styles.vaccineInfoItem}>
                    <Text style={styles.vaccineInfoLabel}>Aplicada em</Text>
                    <Text style={styles.vaccineInfoValue}>
                      {formatDateBR(vaccine.date_applied)}
                    </Text>
                  </View>
                  {vaccine.next_due_date && (
                    <View style={styles.vaccineInfoItem}>
                      <Text style={styles.vaccineInfoLabel}>Próximo reforço</Text>
                      <Text
                        style={[
                          styles.vaccineInfoValue,
                          status === 'overdue' && { color: colors.error },
                          status === 'upcoming' && { color: colors.warning },
                        ]}
                      >
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

                {vaccine.notes ? <Text style={styles.vaccineNotes}>{vaccine.notes}</Text> : null}

                <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}15` }]}>
                  <Ionicons
                    name={cfg.icon as keyof typeof Ionicons.glyphMap}
                    size={13}
                    color={cfg.color}
                  />
                  <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Modal Adicionar / Editar */}
      <VaccineFormModal
        visible={showModal}
        title={editingVaccine ? 'Editar Vacina' : 'Nova Vacina'}
        value={formData}
        onChange={(next) => setFormData((prev) => ({ ...prev, ...next }))}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        saving={saving}
        saveLabel={editingVaccine ? 'Salvar alterações' : 'Adicionar vacina'}
        showExtraFields
        showDateValidityIcon
      />
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
});
