// ---------------------------------------------------------------
// Aba 1 — Início: dashboard com filtros de ano/mês, KPIs,
// 3 gráficos e os últimos lançamentos (com editar/excluir).
// Os indicadores são recalculados na hora a cada mudança de filtro
// e sempre que a aba ganha foco (dados sempre atualizados).
// ---------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../theme/theme';
import { Card, Titulo, KpiCard, EstadoVazio } from '../components/ui';
import SeletorMesAno from '../components/SeletorMesAno';
import DespesaItem from '../components/DespesaItem';
import ModalFicha from '../components/ModalFicha';
import DespesaForm from '../components/DespesaForm';
import { getIndicadores } from '../services/dashboardService';
import { listarDespesas, atualizarDespesa, excluirDespesa } from '../services/despesasService';
import { anosDisponiveis } from '../services/mesesService';
import { getConfig } from '../services/configService';
import { formatMoeda, formatNumero, MESES_ABREV, MESES_LABEL } from '../utils/format';
import { getCategoria } from '../utils/categorias';

const LARGURA_TELA = Dimensions.get('window').width;

export default function InicioScreen() {
  const { cores, escuro } = useTheme();
  const insets = useSafeAreaInsets();
  const hoje = new Date();

  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [anos, setAnos] = useState([hoje.getFullYear()]);
  const [ind, setInd] = useState(null);
  const [ultimos, setUltimos] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [editando, setEditando] = useState(null); // despesa em edição

  const carregar = useCallback((a = ano, m = mes) => {
    setAnos(anosDisponiveis());
    setInd(getIndicadores(a, m));
    setUltimos(listarDespesas({ ano: a, mes: m, limite: 8 }));
    setCfg(getConfig());
  }, [ano, mes]);

  // Recarrega sempre que a aba ganha foco (dashboard sempre consistente)
  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  function mudarFiltro(a, m) {
    setAno(a);
    setMes(m);
    carregar(a, m); // mudança instantânea dos indicadores
  }

  function confirmarExclusao(despesa) {
    Alert.alert('Excluir despesa', 'Deseja realmente excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: () => { excluirDespesa(despesa.id); carregar(); },
      },
    ]);
  }

  function salvarEdicao(dados) {
    const res = atualizarDespesa(editando.id, dados);
    if (!res.ok) { Alert.alert('Erro', res.erro); return; }
    setEditando(null);
    carregar();
  }

  if (!ind) return <View style={{ flex: 1, backgroundColor: cores.background }} />;

  // ---------- dados dos gráficos ----------
  const temDespesasNoMes = ind.porCategoria.length > 0;

  // 1) Barras: recarga fora nos últimos 12 meses
  const dadosBarras = ind.recargaForaUltimos12.map((m) => ({
    value: m.total,
    label: MESES_ABREV[m.mes - 1],
    frontColor: m.mesRef === `${ano}-${String(mes).padStart(2, '0')}` ? cores.primary : cores.primary + '77',
  }));
  const temRecargaFora = dadosBarras.some((d) => d.value > 0);

  // 2) Pizza: distribuição por categoria no mês
  const dadosPizza = ind.porCategoria.map((c) => {
    const cat = getCategoria(c.categoria);
    return { value: c.total, color: cat.cor, text: cat.label };
  });

  // 3) Barras comparativas: reembolsado × pago por mim
  const dadosComparativo = [
    { value: ind.totalReembolsado, label: 'Reembolsado', frontColor: cores.primary },
    { value: ind.totalPago, label: 'Pago por mim', frontColor: '#FB8C00' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: cores.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: cores.text, marginBottom: 2 }}>
          Painel
        </Text>
        <Text style={{ fontSize: 13, color: cores.textSecondary, marginBottom: 10 }}>
          {cfg?.nome_veiculo ? `${cfg.nome_veiculo}${cfg.placa ? ' · ' + cfg.placa : ''}` : 'Seu veículo elétrico'}
        </Text>

        {/* Filtros ano/mês */}
        <SeletorMesAno anos={anos} ano={ano} mes={mes} onChange={mudarFiltro} />

        {/* KPIs */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 8 }}>
          <KpiCard rotulo="KM rodados" icone="speedometer-outline"
            valor={`${formatNumero(ind.km)} km`} />
          <KpiCard rotulo="Reembolso de KM" icone="cash-outline"
            valor={formatMoeda(ind.reembolsoKm)} />
          <KpiCard rotulo="Total de despesas" icone="wallet-outline"
            valor={formatMoeda(ind.totalDespesas)} />
          <KpiCard rotulo="Total reembolsável" icone="business-outline"
            valor={formatMoeda(ind.totalReembolsado)} />
          <KpiCard rotulo="Pago por mim" icone="person-outline" cor="#FB8C00"
            valor={formatMoeda(ind.totalPago)} />
          <KpiCard rotulo="Custo por KM" icone="analytics-outline"
            valor={ind.custoPorKm === null ? '—' : formatMoeda(ind.custoPorKm)} />
        </View>

        {/* Meta mensal, se configurada */}
        {ind.metaKm > 0 ? (
          <Card>
            <Text style={{ fontSize: 12, color: cores.textSecondary }}>
              Meta do mês: {formatNumero(ind.metaKm)} km
            </Text>
            <View style={{ height: 8, backgroundColor: cores.surfaceVariant, borderRadius: 4, marginTop: 6 }}>
              <View
                style={{
                  height: 8, borderRadius: 4, backgroundColor: cores.primary,
                  width: `${Math.min(100, (ind.km / ind.metaKm) * 100)}%`,
                }}
              />
            </View>
            <Text style={{ fontSize: 11, color: cores.textSecondary, marginTop: 4 }}>
              {formatNumero(Math.min(100, (ind.km / ind.metaKm) * 100), 0)}% da meta
            </Text>
          </Card>
        ) : null}

        {/* Gráfico 1 — Recarga fora (12 meses) */}
        <Card>
          <Titulo>Recarga fora de casa — últimos 12 meses</Titulo>
          {temRecargaFora ? (
            <BarChart
              data={dadosBarras}
              width={LARGURA_TELA - 110}
              height={160}
              barWidth={14}
              spacing={10}
              initialSpacing={10}
              barBorderRadius={4}
              noOfSections={4}
              yAxisTextStyle={{ color: cores.textSecondary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: cores.textSecondary, fontSize: 8 }}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={cores.border}
              rulesColor={cores.border}
              isAnimated
            />
          ) : (
            <EstadoVazio icone="flash-outline" titulo="Sem recargas fora de casa"
              mensagem="Nenhum gasto com recarga fora de casa nos últimos 12 meses." />
          )}
        </Card>

        {/* Gráfico 2 — Pizza por categoria */}
        <Card>
          <Titulo>Despesas de {MESES_LABEL[mes - 1]} por categoria</Titulo>
          {temDespesasNoMes ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <PieChart
                data={dadosPizza}
                radius={80}
                innerRadius={45}
                innerCircleColor={cores.surface}
                centerLabelComponent={() => (
                  <Text style={{ fontSize: 11, color: cores.textSecondary, textAlign: 'center' }}>
                    {formatMoeda(ind.totalDespesas)}
                  </Text>
                )}
              />
              <View style={{ flex: 1, marginLeft: 14 }}>
                {dadosPizza.map((d) => (
                  <View key={d.text} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: d.color, marginRight: 6 }} />
                    <Text style={{ fontSize: 11, color: cores.text, flex: 1 }} numberOfLines={1}>{d.text}</Text>
                    <Text style={{ fontSize: 11, color: cores.textSecondary }}>{formatMoeda(d.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <EstadoVazio icone="pie-chart-outline" titulo="Sem despesas neste mês"
              mensagem="Use a aba Lançar para registrar a primeira despesa." />
          )}
        </Card>

        {/* Gráfico 3 — Reembolsado × Pago por mim */}
        <Card>
          <Titulo>Reembolsado × Pago por mim</Titulo>
          {temDespesasNoMes ? (
            <BarChart
              data={dadosComparativo}
              width={LARGURA_TELA - 110}
              height={140}
              barWidth={64}
              spacing={60}
              initialSpacing={30}
              barBorderRadius={6}
              noOfSections={4}
              yAxisTextStyle={{ color: cores.textSecondary, fontSize: 9 }}
              xAxisLabelTextStyle={{ color: cores.textSecondary, fontSize: 11 }}
              yAxisThickness={0}
              xAxisThickness={1}
              xAxisColor={cores.border}
              rulesColor={cores.border}
              isAnimated
            />
          ) : (
            <EstadoVazio icone="swap-horizontal-outline" titulo="Nada a comparar"
              mensagem="Registre despesas para ver a comparação." />
          )}
        </Card>

        {/* Últimos lançamentos */}
        <Titulo style={{ marginTop: 4 }}>Últimos lançamentos</Titulo>
        {ultimos.length ? (
          ultimos.map((d) => (
            <DespesaItem
              key={d.id}
              despesa={d}
              onEditar={() => setEditando(d)}
              onExcluir={() => confirmarExclusao(d)}
            />
          ))
        ) : (
          <Card>
            <EstadoVazio icone="receipt-outline" titulo="Nenhum lançamento neste mês"
              mensagem="Toque em Lançar para registrar despesas ou quilometragem." />
          </Card>
        )}
      </ScrollView>

      {/* Modal de edição */}
      <ModalFicha visivel={!!editando} titulo="Editar despesa" onFechar={() => setEditando(null)}>
        {editando ? (
          <DespesaForm inicial={editando} onSalvar={salvarEdicao} rotuloBotao="Salvar alterações" />
        ) : null}
      </ModalFicha>
    </View>
  );
}
