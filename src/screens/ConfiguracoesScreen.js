// ---------------------------------------------------------------
// Aba 5 — Configurações: preferências do veículo, tarifa por KM,
// tema, backup (exportar/importar JSON) e limpeza total dos dados.
// ---------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';
import { Card, Titulo, Botao, CampoTexto, Segmentos } from '../components/ui';
import { getConfig, setConfigVarias, setConfig } from '../services/configService';
import {
  exportarBackup, escolherArquivoBackup, aplicarBackup, apagarTudo,
} from '../services/backupService';
import { parseValor } from '../utils/format';

export default function ConfiguracoesScreen() {
  const { cores, preferencia, setPreferencia } = useTheme();
  const insets = useSafeAreaInsets();

  const [tarifa, setTarifa] = useState('');
  const [nomeVeiculo, setNomeVeiculo] = useState('');
  const [placa, setPlaca] = useState('');
  const [metaKm, setMetaKm] = useState('');
  const [custoKwhCasa, setCustoKwhCasa] = useState('');
  const [padraoReembolso, setPadraoReembolso] = useState('pago');
  const [salvo, setSalvo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const cfg = getConfig();
      setTarifa(String(cfg.tarifa_km).replace('.', ','));
      setNomeVeiculo(cfg.nome_veiculo);
      setPlaca(cfg.placa);
      setMetaKm(cfg.meta_km_mes ? String(cfg.meta_km_mes).replace('.', ',') : '');
      setCustoKwhCasa(cfg.custo_energia_casa_kwh ? String(cfg.custo_energia_casa_kwh).replace('.', ',') : '');
      setPadraoReembolso(cfg.padrao_reembolso);
    }, [])
  );

  function salvarPreferencias() {
    const t = parseValor(tarifa);
    if (isNaN(t) || t < 0) {
      Alert.alert('Valor inválido', 'Informe uma tarifa por KM válida (ex.: 0,76).');
      return;
    }
    const meta = metaKm.trim() === '' ? 0 : parseValor(metaKm);
    if (isNaN(meta) || meta < 0) {
      Alert.alert('Valor inválido', 'A meta mensal de KM deve ser um número positivo.');
      return;
    }
    const custoKwh = custoKwhCasa.trim() === '' ? 0 : parseValor(custoKwhCasa);
    if (isNaN(custoKwh) || custoKwh < 0) {
      Alert.alert('Valor inválido', 'O custo do kWh em casa deve ser um número positivo.');
      return;
    }

    setConfigVarias({
      tarifa_km: t,
      nome_veiculo: nomeVeiculo.trim(),
      placa: placa.trim().toUpperCase(),
      meta_km_mes: meta,
      custo_energia_casa_kwh: custoKwh,
      padrao_reembolso: padraoReembolso,
    });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  function mudarTema(novo) {
    setPreferencia(novo);
    setConfig('tema', novo); // persiste a escolha
  }

  // ------------------- backup -------------------
  async function aoExportar() {
    const res = await exportarBackup();
    if (!res.ok) Alert.alert('Erro', res.erro);
  }

  async function aoImportar() {
    const res = await escolherArquivoBackup();
    if (res.cancelado) return;
    if (!res.ok) { Alert.alert('Importação inválida', res.erro); return; }

    const { backup } = res;
    Alert.alert(
      'Substituir dados?',
      `O backup contém ${backup.despesas.length} despesa(s) e ${backup.meses.length} mês(es) de quilometragem.\n\n` +
      'TODOS os dados atuais serão substituídos. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Substituir', style: 'destructive',
          onPress: () => {
            const aplicado = aplicarBackup(backup);
            if (aplicado.ok) Alert.alert('Pronto ✅', 'Backup importado com sucesso.');
            else Alert.alert('Erro', aplicado.erro);
          },
        },
      ]
    );
  }

  // ------------------- limpeza (confirmação dupla) -------------------
  function aoApagarTudo() {
    Alert.alert(
      'Apagar todos os dados',
      'Isso removerá TODAS as despesas, quilometragens, relatórios e configurações. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar', style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Tem certeza?',
              'Confirme mais uma vez: apagar TODOS os dados do aplicativo?',
              [
                { text: 'Não, cancelar', style: 'cancel' },
                {
                  text: 'Sim, apagar tudo', style: 'destructive',
                  onPress: () => {
                    apagarTudo();
                    Alert.alert('Concluído', 'Todos os dados foram apagados.');
                  },
                },
              ]
            ),
        },
      ]
    );
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
          Configurações
        </Text>

        <Card>
          <Titulo>Veículo e reembolso</Titulo>
          <CampoTexto rotulo="Tarifa por KM (R$)" valor={tarifa} onChange={setTarifa}
            placeholder="0,76" teclado="decimal-pad" />
          <CampoTexto rotulo="Nome do veículo" valor={nomeVeiculo} onChange={setNomeVeiculo}
            placeholder="Ex.: BYD Dolphin" />
          <CampoTexto rotulo="Placa" valor={placa} onChange={setPlaca}
            placeholder="ABC1D23" />
          <CampoTexto rotulo="Meta de KM por mês" valor={metaKm} onChange={setMetaKm}
            placeholder="Ex.: 1500" teclado="decimal-pad" sufixo="km" />
          <CampoTexto rotulo="Custo da energia em casa (R$/kWh)" valor={custoKwhCasa} onChange={setCustoKwhCasa}
            placeholder="Ex.: 0,92" teclado="decimal-pad" />

          <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
            Situação pré-selecionada ao lançar despesa
          </Text>
          <Segmentos
            opcoes={[
              { id: 'pago', label: 'Paga por mim' },
              { id: 'reembolsado', label: 'Reembolsada' },
            ]}
            valor={padraoReembolso}
            onChange={setPadraoReembolso}
            style={{ marginBottom: 14 }}
          />

          <Botao
            titulo={salvo ? 'Salvo ✅' : 'Salvar preferências'}
            icone="save-outline"
            onPress={salvarPreferencias}
          />
        </Card>

        <Card>
          <Titulo>Aparência</Titulo>
          <Segmentos
            opcoes={[
              { id: 'sistema', label: 'Sistema' },
              { id: 'claro', label: 'Claro' },
              { id: 'escuro', label: 'Escuro' },
            ]}
            valor={preferencia}
            onChange={mudarTema}
          />
        </Card>

        <Card>
          <Titulo>Backup</Titulo>
          <Text style={{ fontSize: 12, color: cores.textSecondary, marginBottom: 12 }}>
            Todos os dados ficam somente neste aparelho. Exporte um arquivo JSON periodicamente
            para não perder seus registros.
          </Text>
          <Botao titulo="Exportar backup (JSON)" icone="download-outline" variante="tonal"
            onPress={aoExportar} style={{ marginBottom: 10 }} />
          <Botao titulo="Importar backup" icone="folder-open-outline" variante="contorno"
            onPress={aoImportar} />
        </Card>

        <Card>
          <Titulo>Zona de perigo</Titulo>
          <Botao titulo="Apagar todos os dados" icone="trash-outline" variante="perigo"
            onPress={aoApagarTudo} />
        </Card>

        <Text style={{ fontSize: 11, color: cores.textSecondary, textAlign: 'center', marginTop: 8 }}>
          Controle EV · dados 100% locais, sem internet
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
