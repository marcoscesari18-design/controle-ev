// ---------------------------------------------------------------
// Seletor de Ano + Mês usado no Dashboard, Histórico e Relatórios.
// Troca instantânea: cada toque dispara onChange imediatamente.
// ---------------------------------------------------------------
import React from 'react';
import { View } from 'react-native';
import { Chips } from './ui';
import { MESES_ABREV } from '../utils/format';

/**
 * props:
 * - anos: lista de anos disponíveis
 * - ano, mes: seleção atual (mes pode ser null quando permitirTodosMeses)
 * - onChange(ano, mes)
 * - permitirTodosMeses: adiciona a opção "Todos" nos meses
 */
export default function SeletorMesAno({ anos, ano, mes, onChange, permitirTodosMeses = false }) {
  const opcoesAno = anos.map((a) => ({ id: a, label: String(a) }));
  const opcoesMes = MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }));

  return (
    <View style={{ marginBottom: 8 }}>
      <Chips opcoes={opcoesAno} valor={ano} onChange={(a) => onChange(a, mes)} />
      <Chips
        opcoes={opcoesMes}
        valor={mes}
        onChange={(m) => onChange(ano, m)}
        permitirTodos={permitirTodosMeses}
      />
    </View>
  );
}
