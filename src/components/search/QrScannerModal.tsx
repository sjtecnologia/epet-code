/**
 * QrScannerModal — modal de câmera para leitura do QR Code da carteira do pet.
 *
 * Extraído de SearchScreen: a tela pai controla a permissão e o estado
 * `paused` (evita leituras duplicadas), recebendo o payload lido via onScanned.
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  /** true quando o QR já foi lido (desativa novas leituras) */
  paused: boolean;
  onScanned: (event: { data: string }) => void;
  onClose: () => void;
};

export function QrScannerModal({ visible, paused, onScanned, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={paused ? undefined : onScanned}
        />

        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escanear QR Code</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.frame} />

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Aponte a câmera para o QR Code da carteira do pet</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  closeButton: {
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
  headerSpacer: {
    width: 44,
  },
  frame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -120,
    marginLeft: -120,
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
    zIndex: 8,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    paddingHorizontal: 32,
  },
  hintText: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
  },
});
