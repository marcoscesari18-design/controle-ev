// ---------------------------------------------------------------
// Modal genérico (folha deslizante) usado para editar registros.
// ---------------------------------------------------------------
import React from 'react';
import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';

export default function ModalFicha({ visivel, titulo, onFechar, children }) {
  const { cores } = useTheme();
  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}
      >
        <View
          style={{
            backgroundColor: cores.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '92%',
            paddingBottom: 24,
          }}
        >
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '800', color: cores.text }}>{titulo}</Text>
            <Pressable onPress={onFechar} hitSlop={12}>
              <Ionicons name="close" size={26} color={cores.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
