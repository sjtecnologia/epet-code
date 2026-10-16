/**
 * BirthDateField — campo de data de nascimento do pet.
 *
 * Mostra o seletor (toque abre o DateTimePicker) e a idade calculada quando há
 * data. No iOS o picker aparece em um modal deslizante; no Android, no diálogo
 * nativo.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../constants/colors';
import { calculateAgeFromDate } from '../../lib/petForm';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  title?: string;
};

const formatDateDisplay = (date: Date) =>
  date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function BirthDateField({
  value,
  onChange,
  placeholder = 'Data de nascimento',
  title = 'Data de Nascimento',
}: Props) {
  const [show, setShow] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selectedDate && event.type !== 'dismissed') {
        onChange(selectedDate);
      }
    } else if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.inputContainer} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={20} color={colors.gray500} style={styles.inputIcon} />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.input,
              styles.dateText,
              !value && styles.placeholderText,
              { paddingVertical: 8 },
            ]}
          >
            {value ? formatDateDisplay(value) : placeholder}
          </Text>
          {value && <Text style={styles.ageText}>{calculateAgeFromDate(value)}</Text>}
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.gray500} />
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <Modal
          visible={show}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModal}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.datePickerCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>{title}</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.datePickerDone}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value ?? new Date()}
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

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
  );
}
