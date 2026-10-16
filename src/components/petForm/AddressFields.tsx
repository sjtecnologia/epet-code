/**
 * AddressFields — bloco de endereço do formulário de pet.
 *
 * Inclui o cabeçalho (título + botão de selecionar endereço salvo), o banner do
 * endereço selecionado e os campos rua/número/complemento. Quando há um endereço
 * salvo selecionado, os campos ficam somente-leitura.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { Address } from '../../types/database.types';
import FormInput from './FormInput';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  savedAddresses: Address[];
  selectedAddressId: string | null;
  onOpenModal: () => void;
  onClearAddress: () => void;
  street: string;
  number: string;
  complement: string;
  onChangeStreet: (text: string) => void;
  onChangeNumber: (text: string) => void;
  onChangeComplement: (text: string) => void;
};

export default function AddressFields({
  savedAddresses,
  selectedAddressId,
  onOpenModal,
  onClearAddress,
  street,
  number,
  complement,
  onChangeStreet,
  onChangeNumber,
  onChangeComplement,
}: Props) {
  const locked = !!selectedAddressId;
  const selectedLabel = savedAddresses.find((a) => a.id === selectedAddressId)?.label;

  return (
    <>
      <View style={styles.addressHeader}>
        <Text style={styles.sectionTitle}>Endereço</Text>
        {savedAddresses.length > 0 && (
          <TouchableOpacity style={styles.selectAddressButton} onPress={onOpenModal}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.selectAddressText}>
              {selectedAddressId ? 'Trocar endereço' : 'Selecionar endereço'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedAddressId && (
        <View style={styles.selectedAddressBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.selectedAddressText}>Usando: {selectedLabel}</Text>
          <TouchableOpacity onPress={onClearAddress}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputGroup}>
        <FormInput
          icon="location-outline"
          placeholder="Rua / Logradouro"
          value={street}
          onChangeText={onChangeStreet}
          editable={!locked}
        />

        {street.length > 0 && (
          <View style={styles.rowInputs}>
            <FormInput
              icon="home-outline"
              placeholder="Número"
              value={number}
              onChangeText={onChangeNumber}
              keyboardType="numeric"
              editable={!locked}
              containerStyle={{ flex: 1 }}
            />
            <FormInput
              icon="business-outline"
              placeholder="Complemento"
              value={complement}
              onChangeText={onChangeComplement}
              editable={!locked}
              containerStyle={{ flex: 1.5 }}
            />
          </View>
        )}
      </View>
    </>
  );
}
