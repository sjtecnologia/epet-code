/**
 * PesosScreen — controle de peso do pet com gráfico de evolução.
 *
 * Registra pesagens ao longo do tempo e exibe um gráfico de linha.
 * Dados armazenados na subcoleção `pets/{petId}/weights` no Firestore.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Alert } from '../../lib/alert';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart } from 'react-native-gifted-charts';
import { collection, addDoc, getDocs, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { firestore } from '../../lib/firebase';
import { colors } from '../../constants/colors';
import { DashboardStackParamList } from '../../types/navigation.types';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'Pesos'>;
  route: RouteProp<DashboardStackParamList, 'Pesos'>;
};

type Pesagem = {
  id: string;
  peso: number;
  data: string;
  observacao: string;
  created_at: string;
};

/** Converte DD/MM/AAAA para timestamp numérico usado na ordenação */
const parseDateBR = (dateStr: string): number => {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  return 0;
};

export default function PesosScreen({ navigation, route }: Props) {
  const { pet } = route.params;
  const { width } = useWindowDimensions();
  const [pesagens, setPesagens] = useState<Pesagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [peso, setPeso] = useState('');
  const [data, setData] = useState('');
  const [observacao, setObservacao] = useState('');

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(firestore, 'pets', pet.id, 'weights'),
        orderBy('created_at', 'asc'),
      );
      const snapshot = await getDocs(q);
      const raw = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Pesagem);
      // Ordena pelo campo `data` (DD/MM/AAAA) cronologicamente,
      // independente da ordem de inserção no Firestore
      const sorted = [...raw].sort((a, b) => parseDateBR(a.data) - parseDateBR(b.data));
      setPesagens(sorted);
    } catch {
      // silently fail — mostra lista vazia
    } finally {
      setLoading(false);
    }
  }, [pet.id]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
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
    const pesoNum = parseFloat(peso.replace(',', '.'));
    if (!peso || isNaN(pesoNum) || pesoNum <= 0) {
      Alert.alert('Peso inválido', 'Informe um peso válido em kg.');
      return;
    }
    if (data && !isDataValida(data)) {
      Alert.alert('Data inválida', 'Informe uma data válida no formato DD/MM/AAAA.');
      return;
    }
    setSaving(true);
    try {
      const dataFormatada = data || new Date().toLocaleDateString('pt-BR');
      // Salva também `date_iso` (YYYY-MM-DD) para permitir ordenação futura no Firestore
      const [dd, mm, yyyy] = dataFormatada.split('/');
      const dateIso = `${yyyy}-${mm}-${dd}`;
      await addDoc(collection(firestore, 'pets', pet.id, 'weights'), {
        peso: pesoNum,
        data: dataFormatada,
        date_iso: dateIso,
        observacao: observacao.trim(),
        created_at: new Date().toISOString(),
      });
      setModalVisible(false);
      setPeso('');
      setData('');
      setObservacao('');
      carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a pesagem.');
    } finally {
      setSaving(false);
    }
  };

  const excluir = (id: string) => {
    Alert.alert('Excluir pesagem', 'Tem certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(firestore, 'pets', pet.id, 'weights', id));
          carregar();
        },
      },
    ]);
  };

  const ultimoPeso = pesagens[pesagens.length - 1];
  const primeiroPeso = pesagens[0];
  const variacao = pesagens.length >= 2 ? (ultimoPeso.peso - primeiroPeso.peso).toFixed(2) : null;

  // Gráfico: usa no máximo as 8 pesagens mais recentes para caber no container
  const MAX_CHART_POINTS = 8;
  const chartPesagens = pesagens.slice(-MAX_CHART_POINTS);
  const chartPoints = chartPesagens.map((p) => ({
    value: p.peso,
    label: p.data.slice(0, 5), // DD/MM
  }));

  // list padding (16*2) + chartContainer padding (16*2) + y-axis width
  const YAXIS_WIDTH = 50;
  const chartAreaWidth = width - 32 - 32 - YAXIS_WIDTH;
  const EDGE_SPACING = 16; // initialSpacing + endSpacing por lado
  const chartSpacing =
    chartPoints.length > 1
      ? Math.floor((chartAreaWidth - EDGE_SPACING * 2) / (chartPoints.length - 1))
      : chartAreaWidth - EDGE_SPACING * 2;

  const renderItem = (item: Pesagem) => (
    <View key={item.id} style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.pesoValor}>{item.peso.toFixed(2)} kg</Text>
        <Text style={styles.pesoData}>{item.data}</Text>
        {item.observacao ? <Text style={styles.pesoObs}>{item.observacao}</Text> : null}
      </View>
      <TouchableOpacity
        onPress={() => excluir(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pesos</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.headerBtn}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>{pet.name}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {/* Cards de resumo */}
          {pesagens.length > 0 && (
            <View style={styles.resumoRow}>
              <View style={styles.resumoCard}>
                <Text style={styles.resumoLabel}>Peso Atual</Text>
                <Text style={styles.resumoValor}>{ultimoPeso.peso.toFixed(2)} kg</Text>
              </View>
              {variacao !== null && (
                <View style={styles.resumoCard}>
                  <Text style={styles.resumoLabel}>Variação Total</Text>
                  <Text
                    style={[
                      styles.resumoValor,
                      { color: parseFloat(variacao) >= 0 ? colors.error : colors.primary },
                    ]}
                  >
                    {parseFloat(variacao) >= 0 ? '+' : ''}
                    {variacao} kg
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Gráfico interativo — toque e arraste para ver os valores */}
          {chartPoints.length >= 2 && (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Evolução de Peso</Text>
                {pesagens.length > MAX_CHART_POINTS ? (
                  <Text style={styles.chartHint}>Últimas {MAX_CHART_POINTS} pesagens</Text>
                ) : (
                  <Text style={styles.chartHint}>Toque e arraste para ver valores</Text>
                )}
              </View>
              <LineChart
                data={chartPoints}
                height={200}
                spacing={chartSpacing}
                color={colors.primary}
                thickness={2.5}
                dataPointsColor={colors.primary}
                dataPointsRadius={6}
                isAnimated
                animationDuration={700}
                curved
                noOfSections={4}
                rulesColor={colors.gray100 ?? '#F3F4F6'}
                rulesType="solid"
                yAxisColor="transparent"
                xAxisColor={colors.gray200}
                yAxisTextStyle={{ color: colors.gray500, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: colors.gray500, fontSize: 10 }}
                initialSpacing={EDGE_SPACING}
                endSpacing={EDGE_SPACING}
                width={chartAreaWidth}
                yAxisLabelWidth={YAXIS_WIDTH}
                yAxisLabelSuffix=" kg"
                pointerConfig={{
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  showPointerStrip: true,
                  pointerStripColor: colors.primaryLight,
                  pointerStripWidth: 2,
                  pointer1Color: colors.primary,
                  radius: 7,
                  pointerLabelWidth: 110,
                  pointerLabelHeight: 58,
                  pointerLabelComponent: (items: { value: number; label: string }[]) => (
                    <View style={styles.tooltipBox}>
                      <Text style={styles.tooltipPeso}>{items[0].value.toFixed(2)} kg</Text>
                      <Text style={styles.tooltipData}>{items[0].label}</Text>
                    </View>
                  ),
                }}
              />
            </View>
          )}

          {pesagens.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="scale-outline" size={56} color={colors.gray300} />
              <Text style={styles.emptyTitle}>Nenhuma pesagem</Text>
              <Text style={styles.emptySubtitle}>Toque no + para registrar o peso do pet.</Text>
            </View>
          )}

          {pesagens.length > 0 && <Text style={styles.historicoTitle}>Histórico</Text>}

          {[...pesagens].reverse().map(renderItem)}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal */}
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
              <Text style={styles.modalTitle}>Registrar Peso</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Peso (kg) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 4.5"
              placeholderTextColor={colors.gray400}
              value={peso}
              onChangeText={setPeso}
              keyboardType="decimal-pad"
            />

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

            <Text style={styles.label}>Observação (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: em jejum, pós-cirurgia..."
              placeholderTextColor={colors.gray400}
              value={observacao}
              onChangeText={setObservacao}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={salvar} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Salvar Pesagem</Text>
              )}
            </TouchableOpacity>
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
  resumoRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  resumoCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  resumoLabel: { fontSize: 12, color: colors.gray500, marginBottom: 4 },
  resumoValor: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: colors.gray700 },
  chartHint: { fontSize: 11, color: colors.gray400 },
  historicoTitle: { fontSize: 14, fontWeight: '600', color: colors.gray600, marginBottom: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardLeft: { flex: 1 },
  pesoValor: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  pesoData: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  pesoObs: { fontSize: 13, color: colors.gray600, marginTop: 4, fontStyle: 'italic' },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 40, paddingHorizontal: 40 },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray600, marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.gray300,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  tooltipBox: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tooltipPeso: { fontSize: 15, fontWeight: '700', color: colors.primary },
  tooltipData: { fontSize: 11, color: colors.gray500, marginTop: 2 },
});
