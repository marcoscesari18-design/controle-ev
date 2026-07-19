// ---------------------------------------------------------------
// Aba 3 — Histórico: consulta e edição de lançamentos.
// - Despesas: filtros de ano, mês e categoria + busca por texto;
//   ações de editar, duplicar e excluir.
// - Quilometragem: lista dos meses registrados, com edição/exclusão.
// Sempre ordenado do mais recente para o mais antigo.
// ---------------------------------------------------------------
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';
import { CampoTexto, Chips, Segmentos, Card, EstadoVazio } from '../components/ui';
import DespesaItem from '../components/DespesaItem';
import ModalFicha from '../components/ModalFicha';
import DespesaForm from '../components/DespesaForm';
import KmForm from '../components/KmForm';
import {
  listarDespesas, atualizarDespesa, duplicarDespesa, excluirDespesa,
} from '../services/despesasService';
import { listarMeses, salvarKm, excluirMes, anosDisponiveis } from '../services/mesesService';
import { CATEGORIAS } from '../utils/categorias';
import { formatNumero, formatMoeda, MESES_ABREV, MESES_LABEL } from '../utils/format';

export default function HistoricoScreen() {
  const { cores } = useTheme();
  const insets = useSafeAreaInsets();
  const hoje = new Date();

  const [aba, setAba] = useState('despesas'); // 'despesas' | 'km'

  // Filtros de despesas
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(null); // null = todos os meses do ano
  const [categoria, setCategoria] = useState(null);
  const [busca, setBusca] = useState('');
  const [anos, setAnos] = useState([hoje.getFullYear()]);

  const [despesas, setDespesas] = useState([]);
  const [meses, setMeses] = useState([]);
  const [editandoDespesa, setEditandoDespesa] = useState(null);
  const [editandoMes, setEditandoMes] = useState(null);

  const carregar = useCallback(() => {
    setAnos(anosDisponiveis());
    setDespesas(listarDespesas({ ano, mes, categoria, busca }));
    setMeses(listarMeses());
  }, [ano, mes, categoria, busca]);

  useFocusEffect(useCallback(() => { carregar(); }, [carregar]));

  // ------------------- ações de despesa -------------------
  function aoExcluirDespesa(d) {
    Alert.alert('Excluir despesa', 'Deseja realmente excluir este lançamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => { excluirDespesa(d.id); carregar(); } },
    ]);
  }

  function aoDuplicarDespesa(d) {
    const res = duplicarDespesa(d.id);
    if (!res.ok) Alert.alert('Erro', res.erro);
    carregar();
  }

  function salvarEdicaoDespesa(dados) {
    const res = atualizarDespesa(editandoDespesa.id, dados);
    if (!res.ok) { Alert.alert('Erro', res.erro); return; }
    setEditandoDespesa(null);
    carregar();
  }

  // ------------------- ações de quilometragem -------------------
  function aoExcluirMes(m) {
    Alert.alert(
      'Excluir quilometragem',
      `Excluir o registro de ${MESES_LABEL[m.mes - 1]}/${m.ano}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => { excluirMes(m.id); carregar(); } },
      ]
    );
  }

  function salvarEdicaoMes(dados) {
    const res = salvarKm(dados);
    if (!res.ok) { Alert.alert('Erro', res.erro); return; }
    setEditandoMes(null);
    carregar();
  }

  // ------------------- cabeçalho da lista -------------------
  const Cabecalho = (
    <View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: cores.text, marginBottom: 12 }}>
        Histórico
      </Text>

      <Segmentos
        opcoes={[
          { id: 'despesas', label: 'Despesas' },
          { id: 'km', label: 'Quilometragem' },
        ]}
        valor={aba}
        onChange={setAba}
        style={{ marginBottom: 12 }}
      />

      {aba === 'despesas' ? (
        <View>
          <CampoTexto
            valor={busca}
            onChange={setBusca}
            placeholder="Pesquisar por descrição ou local…"
          />
          <Chips opcoes={anos.map((a) => ({ id: a, label: String(a) }))} valor={ano} onChange={setAno} />
          <Chips
            opcoes={MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }))}
            valor={mes}
            onChange={setMes}
            permitirTodos
            rotuloTodos="Ano todo"
          />
          <Chips
            opcoes={CATEGORIAS.map((c) => ({ id: c.id, label: c.label, icone: c.icone }))}
            valor={categoria}
            onChange={setCategoria}
            permitirTodos
            rotuloTodos="Todas"
          />
          <View style={{ height: 8 }} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: cores.background }}>
      {aba === 'despesas' ? (
        <FlatList
          data={despesas}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}
          ListHeaderComponent={Cabecalho}
          ListEmptyComponent={
            <Card>
              <EstadoVazio
                icone="search-outline"
                titulo="Nenhuma despesa encontrada"
                mensagem="Ajuste os filtros ou registre uma nova despesa na aba Lançar."
              />
            </Card>
          }
          renderItem={({ item }) => (
            <DespesaItem
              despesa={item}
              onEditar={() => setEditandoDespesa(item)}
              onDuplicar={() => aoDuplicarDespesa(item)}
              onExcluir={() => aoExcluirDespesa(item)}
            />
          )}
        />
      ) : (
        <FlatList
          data={meses}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 32 }}
          ListHeaderComponent={Cabecalho}
          ListEmptyComponent={
            <Card>
              <EstadoVazio
                icone="speedometer-outline"
                titulo="Nenhum mês registrado"
                mensagem="Registre a quilometragem na aba Lançar."
              />
            </Card>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: 8, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: cores.text }}>
                    {MESES_LABEL[item.mes - 1]}/{item.ano}
                  </Text>
                  <Text style={{ fontSize: 12, color: cores.textSecondary, marginTop: 2 }}>
                    {item.odometro_inicio != null
                      ? `Odômetro: ${formatNumero(item.odometro_inicio)} → ${formatNumero(item.odometro_fim)}`
                      : 'KM digitados manualmente'}
                    {item.observacao ? ` · ${item.observacao}` : ''}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: cores.primary, marginRight: 12 }}>
                  {formatNumero(item.km_rodados)} km
                </Text>
                <Ionicons
                  name="create-outline" size={22} color={cores.primary}
                  style={{ marginRight: 14 }}
                  onPress={() => setEditandoMes(item)}
                />
                <Ionicons
                  name="trash-outline" size={22} color={cores.danger}
                  onPress={() => aoExcluirMes(item)}
                />
              </View>
            </Card>
          )}
        />
      )}

      {/* Modais de edição */}
      <ModalFicha
        visivel={!!editandoDespesa}
        titulo="Editar despesa"
        onFechar={() => setEditandoDespesa(null)}
      >
        {editandoDespesa ? (
          <DespesaForm inicial={editandoDespesa} onSalvar={salvarEdicaoDespesa} rotuloBotao="Salvar alterações" />
        ) : null}
      </ModalFicha>

      <ModalFicha
        visivel={!!editandoMes}
        titulo="Editar quilometragem"
        onFechar={() => setEditandoMes(null)}
      >
        {editandoMes ? <KmForm inicial={editandoMes} onSalvar={salvarEdicaoMes} /> : null}
      </ModalFicha>
    </View>
  );
}
