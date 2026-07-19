// ---------------------------------------------------------------
// Aba 4 — Relatórios: geração dos dois modelos de PDF
// (Relatório de KM e KM + Despesas), com período de um mês ou
// intervalo de meses, compartilhamento e histórico local.
// ---------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';
import { Card, Titulo, Botao, Segmentos, Chips, EstadoVazio } from '../components/ui';
import {
  gerarRelatorio, compartilharPdf, listarHistoricoRelatorios,
  excluirHistoricoRelatorio, obterOuRegenerarPdf,
} from '../services/relatorioService';
import { anosDisponiveis } from '../services/mesesService';
import { MESES_ABREV, labelMesRef, formatData } from '../utils/format';

export default function RelatoriosScreen() {
  const { cores } = useTheme();
  const insets = useSafeAreaInsets();
  const hoje = new Date();

  const [tipo, setTipo] = useState('km'); // 'km' | 'completo'
  const [modoPeriodo, setModoPeriodo] = useState('mes'); // 'mes' | 'intervalo'

  const [anoIni, setAnoIni] = useState(hoje.getFullYear());
  const [mesIni, setMesIni] = useState(hoje.getMonth() + 1);
  const [anoFim, setAnoFim] = useState(hoje.getFullYear());
  const [mesFim, setMesFim] = useState(hoje.getMonth() + 1);

  const [anos, setAnos] = useState([hoje.getFullYear()]);
  const [historico, setHistorico] = useState([]);
  const [gerando, setGerando] = useState(false);

  const carregar = useCallback(() => {
    setAnos(anosDisponiveis());
    setHistorico(listarHistoricoRelatorios());
  }, []);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  const ref = (a, m) => `${a}-${String(m).padStart(2, '0')}`;

  async function gerar() {
    const inicio = ref(anoIni, mesIni);
    const fim = modoPeriodo === 'mes' ? inicio : ref(anoFim, mesFim);

    if (inicio > fim) {
      Alert.alert('Período inválido', 'O mês inicial deve ser anterior ao mês final.');
      return;
    }

    setGerando(true);
    try {
      const res = await gerarRelatorio(tipo, inicio, fim);
      if (!res.ok) {
        Alert.alert('Erro', res.erro);
        return;
      }
      carregar();
      // Oferece o compartilhamento logo após gerar
      Alert.alert('PDF gerado ✅', `Arquivo: ${res.nome}`, [
        { text: 'Fechar', style: 'cancel' },
        { text: 'Compartilhar', onPress: () => compartilharPdf(res.uri) },
      ]);
    } finally {
      setGerando(false);
    }
  }

  async function compartilharDoHistorico(item) {
    const res = await obterOuRegenerarPdf(item);
    if (!res.ok) { Alert.alert('Erro', res.erro); return; }
    await compartilharPdf(res.uri);
  }

  function excluirDoHistorico(item) {
    Alert.alert('Excluir do histórico', 'Remover este relatório do histórico? O PDF poderá ser recriado depois.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => { excluirHistoricoRelatorio(item.id); carregar(); },
      },
    ]);
  }

  const labelPeriodoItem = (item) =>
    item.periodo_inicio === item.periodo_fim
      ? labelMesRef(item.periodo_inicio)
      : `${labelMesRef(item.periodo_inicio)} a ${labelMesRef(item.periodo_fim)}`;

  return (
    <View style={{ flex: 1, backgroundColor: cores.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: cores.text, marginBottom: 12 }}>
          Relatórios
        </Text>

        <Card>
          <Titulo>Modelo do relatório</Titulo>
          <Segmentos
            opcoes={[
              { id: 'km', label: 'Relatório de KM' },
              { id: 'completo', label: 'KM + Despesas' },
            ]}
            valor={tipo}
            onChange={setTipo}
            style={{ marginBottom: 14 }}
          />

          <Titulo>Período</Titulo>
          <Segmentos
            opcoes={[
              { id: 'mes', label: 'Um mês' },
              { id: 'intervalo', label: 'Intervalo de meses' },
            ]}
            valor={modoPeriodo}
            onChange={setModoPeriodo}
            style={{ marginBottom: 12 }}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
            {modoPeriodo === 'mes' ? 'Mês do relatório' : 'Mês inicial'}
          </Text>
          <Chips opcoes={anos.map((a) => ({ id: a, label: String(a) }))} valor={anoIni} onChange={setAnoIni} />
          <Chips
            opcoes={MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }))}
            valor={mesIni}
            onChange={setMesIni}
          />

          {modoPeriodo === 'intervalo' ? (
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
                Mês final
              </Text>
              <Chips opcoes={anos.map((a) => ({ id: a, label: String(a) }))} valor={anoFim} onChange={setAnoFim} />
              <Chips
                opcoes={MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }))}
                valor={mesFim}
                onChange={setMesFim}
              />
            </View>
          ) : null}

          <View style={{ height: 12 }} />
          {gerando ? (
            <View style={{ alignItems: 'center', padding: 12 }}>
              <ActivityIndicator color={cores.primary} size="large" />
              <Text style={{ color: cores.textSecondary, marginTop: 8, fontSize: 13 }}>
                Gerando PDF…
              </Text>
            </View>
          ) : (
            <Botao titulo="Gerar PDF" icone="document-text-outline" onPress={gerar} />
          )}
        </Card>

        {/* Histórico de relatórios */}
        <Titulo style={{ marginTop: 8 }}>Histórico de relatórios</Titulo>
        {historico.length ? (
          historico.map((item) => (
            <Card key={item.id} style={{ padding: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name={item.tipo === 'km' ? 'speedometer-outline' : 'receipt-outline'}
                  size={22}
                  color={cores.primary}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: cores.text }}>
                    {item.tipo === 'km' ? 'Relatório de KM' : 'KM + Despesas'} · {labelPeriodoItem(item)}
                  </Text>
                  <Text style={{ fontSize: 11, color: cores.textSecondary, marginTop: 2 }} numberOfLines={1}>
                    {item.nome_arquivo} · gerado em {formatData(item.created_at.slice(0, 10))}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  flexDirection: 'row', justifyContent: 'flex-end', gap: 16,
                  marginTop: 8, borderTopWidth: 1, borderTopColor: cores.border, paddingTop: 8,
                }}
              >
                <Text
                  style={{ color: cores.primary, fontWeight: '700', fontSize: 13 }}
                  onPress={() => compartilharDoHistorico(item)}
                >
                  <Ionicons name="share-social-outline" size={14} /> Compartilhar
                </Text>
                <Text
                  style={{ color: cores.danger, fontWeight: '700', fontSize: 13 }}
                  onPress={() => excluirDoHistorico(item)}
                >
                  <Ionicons name="trash-outline" size={14} /> Excluir
                </Text>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <EstadoVazio
              icone="documents-outline"
              titulo="Nenhum relatório gerado"
              mensagem="Os relatórios que você gerar aparecerão aqui e poderão ser recriados a qualquer momento."
            />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
