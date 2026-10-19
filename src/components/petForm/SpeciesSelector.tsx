/**
 * SpeciesSelector — grade de seleção de espécie do pet.
 *
 * Renderiza as opções de `speciesOptions` (cachorro, gato, pássaro, outro)
 * como botões selecionáveis, destacando a opção ativa.
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { speciesOptions, SpeciesId } from '../../lib/petForm';
import { petFormStyles as styles } from './petFormStyles';

type Props = {
  value: SpeciesId;
  onChange: (species: SpeciesId) => void;
};

export default function SpeciesSelector({ value, onChange }: Props) {
  return (
    <View style={styles.speciesContainer}>
      {speciesOptions.map((option) => {
        const active = value === option.id;
        return (
          <TouchableOpacity
            key={option.id}
            style={[styles.speciesOption, active && styles.speciesOptionActive]}
            onPress={() => onChange(option.id)}
          >
            <View
              style={[styles.speciesIconContainer, active && styles.speciesIconContainerActive]}
            >
              <Ionicons name={option.icon} size={24} color={active ? '#fff' : colors.primary} />
            </View>
            <Text style={[styles.speciesLabel, active && styles.speciesLabelActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
