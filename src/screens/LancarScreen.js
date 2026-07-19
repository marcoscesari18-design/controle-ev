// ---------------------------------------------------------------
// Aba 2 — Lançar: cadastro rápido de despesa ou quilometragem.
// Fluxo pensado para levar menos de 15 segundos:
// categoria -> valor -> salvar (máximo de 3 toques essenciais).
// ---------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { Segmentos } from '../components/ui';
import DespesaForm from '../components/DespesaForm';
import KmForm from '../components/KmForm';
import { inserirDespesa } from '../services/despesasService';
import { salvarKm } from '../services/mesesService';
import { getConfig } from '../services/configService';
import { formatNumero } from '../utils/format';

export default function LancarScreen() {
  const { cores } = useTheme();
  const insets = useSafeAreaInsets();
  const [tipo, setTipo] = useState('despesa'); // 'despesa' | 'km'
  const [padraoReembolso, setPadraoReembolso] = useState('pago');
  const [mensagem, setMensagem] = useState(null); // feedback visual imediato
  const [chaveForm, setChaveForm] = useState(0);  // recria o formulário após salvar
  const [animacao] = useState(new Animated.Value(0));

  // Recarrega a configuração sempre que a aba ganha foco
  useFocusEffect(
    useCallback(() => {
      const cfg = getConfig();
      setPadraoReembolso(cfg.padrao_reembolso);
    }, [])
  );

  function mostrarFeedback(texto) {
    setMensagem(texto);
    animacao.setValue(0);
    Animated.sequence([
      Animated.timing(animacao, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(animacao, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setMensagem(null));
  }

  function salvarDespesa(dados) {
    const res = inserirDespesa(dados);
    if (!res.ok) {
      mostrarFeedback('⚠️ ' + res.erro);
      return;
    }
    setChaveForm((k) => k + 1); // limpa o formulário
    mostrarFeedback('✅ Despesa salva!');
  }

  function salvarQuilometragem(dados) {
    const res = salvarKm(dados);
    if (!res.ok) {
      mostrarFeedback('⚠️ ' + res.erro);
      return;
    }
    setChaveForm((k) => k + 1);
    mostrarFeedback(`✅ ${formatNumero(res.km)} km salvos!`);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: cores.background }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: cores.text, marginBottom: 12 }}>
          Lançar
        </Text>

        <Segmentos
          opcoes={[
            { id: 'despesa', label: 'Despesa' },
            { id: 'km', label: 'Quilometragem' },
          ]}
          valor={tipo}
          onChange={setTipo}
          style={{ marginBottom: 16 }}
        />

        {tipo === 'despesa' ? (
          <DespesaForm
            key={`despesa-${chaveForm}`}
            padraoReembolso={padraoReembolso}
            onSalvar={salvarDespesa}
          />
        ) : (
          <KmForm key={`km-${chaveForm}`} onSalvar={salvarQuilometragem} />
        )}
      </ScrollView>

      {/* Feedback visual imediato após salvar */}
      {mensagem ? (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 24, left: 20, right: 20,
            backgroundColor: cores.primaryContainer,
            borderRadius: 14, padding: 14,
            opacity: animacao,
            transform: [{ translateY: animacao.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            borderWidth: 1, borderColor: cores.primary,
          }}
        >
          <Text style={{ color: cores.onPrimaryContainer, fontWeight: '700', textAlign: 'center' }}>
            {mensagem}
          </Text>
        </Animated.View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
