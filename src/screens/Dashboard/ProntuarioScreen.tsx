/**
 * ProntuarioScreen — prontuário médico do pet.
 *
 * Lista registros clínicos (consultas, exames, procedimentos) e permite
 * adicionar novos via modal. Dados armazenados na subcoleção
 * `pets/{petId}/prontuario` no Firestore.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'Prontuario'>;
  route: RouteProp<DashboardStackParamList, 'Prontuario'>;
};

type EntradaProntuario = {
  id: string;
  tipo: string;
  descricao: string;
  veterinario: string;
  data: string;
  created_at: string;
};

const TIPOS = ['Consulta', 'Exame', 'Procedimento', 'Vacinação', 'Cirurgia', 'Outro'];

const tipoIcon = (tipo: string): keyof typeof Ionicons.glyphMap => {
  switch (tipo) {
    case 'Consulta':
      return 'medkit-outline';
    case 'Exame':
      return 'document-text';
    case 'Procedimento':
      return 'medical';
    case 'Vacinação':
      return 'bandage';
    case 'Cirurgia':
      return 'cut';
    default:
      return 'clipboard';
  }
};

export default function ProntuarioScreen({ navigation, route }: Props) {
  const { pet } = route.params;
  const [entradas, setEntradas] = useState<EntradaProntuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Formulário do modal
  const [tipo, setTipo] = useState('Consulta');
  const [descricao, setDescricao] = useState('');
  const [veterinario, setVeterinario] = useState('');
  const [data, setData] = useState('');

  const carregarEntradas = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(firestore, 'pets', pet.id, 'prontuario'),
        orderBy('created_at', 'desc'),
      );
      const snapshot = await getDocs(q);
      setEntradas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as EntradaProntuario));
    } catch (err) {
      console.error('Erro ao carregar prontuário:', err);
    } finally {
      setLoading(false);
    }
  }, [pet.id]);

  useFocusEffect(
    useCallback(() => {
      carregarEntradas();
    }, [carregarEntradas]),
  );

  const formatarDataDigitada = (value: string): string => {
    let nums = value.replace(/\D/g, '');
    // Clamp dia: primeiro dígito 0-3; se 3, segundo dígito só 0-1
    if (nums.length >= 1 && parseInt(nums[0]) > 3) nums = '3' + nums.slice(1);
    if (nums.length >= 2) {
      if (nums[0] === '3' && parseInt(nums[1]) > 1) nums = nums[0] + '1' + nums.slice(2);
      if (nums[0] === '0' && nums[1] === '0') nums = nums[0] + '1' + nums.slice(2);
    }
    // Clamp mês: primeiro dígito 0-1; se 1, segundo dígito só 0-2
    if (nums.length >= 3 && parseInt(nums[2]) > 1) nums = nums.slice(0, 2) + '1' + nums.slice(3);
    if (nums.length >= 4) {
      if (nums[2] === '1' && parseInt(nums[3]) > 2) nums = nums.slice(0, 3) + '2' + nums.slice(4);
      if (nums[2] === '0' && nums[3] === '0') nums = nums.slice(0, 3) + '1' + nums.slice(4);
    }
    nums = nums.slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
    return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
  };

  const isDataValida = (value: string): boolean => {
    const d = value.replace(/\D/g, '');
    if (d.length !== 8) return false;
    const day = parseInt(d.slice(0, 2), 10);
    const month = parseInt(d.slice(2, 4), 10);
    const year = parseInt(d.slice(4, 8), 10);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

  const salvar = async () => {
    if (!descricao.trim()) {
      Alert.alert('Campo obrigatório', 'Preencha a descrição.');
      return;
    }
    if (data && !isDataValida(data)) {
      Alert.alert('Data inválida', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(firestore, 'pets', pet.id, 'prontuario'), {
        tipo,
        descricao: descricao.trim(),
        veterinario: veterinario.trim(),
        data: data || new Date().toLocaleDateString('pt-BR'),
        created_at: new Date().toISOString(),
      });
      setModalVisible(false);
      setDescricao('');
      setVeterinario('');
      setData('');
      setTipo('Consulta');
      carregarEntradas();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o registro.');
    } finally {
      setSaving(false);
    }
  };

  const excluir = (id: string) => {
    Alert.alert('Excluir registro', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(firestore, 'pets', pet.id, 'prontuario', id));
          carregarEntradas();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: EntradaProntuario }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.tipoBadge}>
          <Ionicons name={tipoIcon(item.tipo)} size={14} color={colors.primary} />
          <Text style={styles.tipoText}>{item.tipo}</Text>
        </View>
        <Text style={styles.dataText}>{item.data}</Text>
        <TouchableOpacity
          onPress={() => excluir(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
      <Text style={styles.descricao}>{item.descricao}</Text>
      {item.veterinario ? (
        <View style={styles.vetRow}>
          <Ionicons name="person-outline" size={13} color={colors.gray500} />
          <Text style={styles.vetText}>{item.veterinario}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prontuário</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{pet.name}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : entradas.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="clipboard-outline" size={56} color={colors.gray300} />
          <Text style={styles.emptyTitle}>Nenhum registro</Text>
          <Text style={styles.emptySubtitle}>
            Toque no + para adicionar uma entrada ao prontuário.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entradas}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal de novo registro */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Novo Registro</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tipo */}
              <Text style={styles.label}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiposRow}>
                {TIPOS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tipoChip, tipo === t && styles.tipoChipActive]}
                    onPress={() => setTipo(t)}
                  >
                    <Text style={[styles.tipoChipText, tipo === t && styles.tipoChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Data */}
              <Text style={styles.label}>Data</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.gray400}
                value={data}
                onChangeText={(v) => setData(formatarDataDigitada(v))}
                keyboardType="numeric"
                maxLength={10}
              />

              {/* Veterinário */}
              <Text style={styles.label}>Veterinário (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome do veterinário"
                placeholderTextColor={colors.gray400}
                value={veterinario}
                onChangeText={setVeterinario}
              />

              {/* Descrição */}
              <Text style={styles.label}>Descrição *</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Descreva o atendimento, diagnóstico, prescrição..."
                placeholderTextColor={colors.gray400}
                value={descricao}
                onChangeText={setDescricao}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity style={styles.saveBtn} onPress={salvar} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar Registro</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundLight },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: colors.primary,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
    backgroundColor: colors.primaryLight,
    color: '#fff',
    marginBottom: 8,
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tipoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  tipoText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  dataText: { flex: 1, fontSize: 13, color: colors.gray500, textAlign: 'right', marginRight: 8 },
  descricao: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  vetRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  vetText: { fontSize: 13, color: colors.gray500 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: colors.gray700 },
  emptySubtitle: { fontSize: 14, color: colors.gray500, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginBottom: 6, marginTop: 14 },
  tiposRow: { marginBottom: 4 },
  tipoChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.gray300,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  tipoChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tipoChipText: { fontSize: 13, color: colors.gray700 },
  tipoChipTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: '#fff',
  },
  inputMultiline: { height: 100, paddingTop: 12 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
