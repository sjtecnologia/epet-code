/**
 * AddressModal — bottom sheet de seleção de endereço salvo.
 *
 * Lista os endereços do usuário, destaca o selecionado, marca o padrão e oferece
 * a opção de preencher o endereço manualmente.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Address } from '../../types/database.types';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  visible: boolean;
  onClose: () => void;
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect: (address: Address) => void;
  onManual: () => void;
  manualOptionText: string;
};

export default function AddressModal({
  visible,
  onClose,
  addresses,
  selectedAddressId,
  onSelect,
  onManual,
  manualOptionText,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <View style={styles.addressModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecionar Endereço</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.gray600} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.addressList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {addresses.map((address) => {
                const selected = selectedAddressId === address.id;
                return (
                  <TouchableOpacity
                    key={address.id}
                    style={[styles.addressItem, selected && styles.addressItemSelected]}
                    onPress={() => onSelect(address)}
                  >
                    <View style={styles.addressItemHeader}>
                      <View style={styles.addressLabelContainer}>
                        <Ionicons
                          name="location"
                          size={20}
                          color={selected ? colors.primary : colors.gray600}
                        />
                        <Text
                          style={[styles.addressLabel, selected && styles.addressLabelSelected]}
                        >
                          {address.label}
                        </Text>
                        {address.is_default && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Padrão</Text>
                          </View>
                        )}
                      </View>
                      {selected && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.addressItemText}>
                      {address.street}, {address.number}
                      {address.complement && ` - ${address.complement}`}
                    </Text>
                    <Text style={styles.addressItemCep}>CEP: {address.cep}</Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={styles.manualAddressOption} onPress={onManual}>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
                <Text style={styles.manualAddressText}>{manualOptionText}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
