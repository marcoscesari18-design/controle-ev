// ---------------------------------------------------------------
// Formulário de quilometragem mensal.
// O usuário escolhe UM dos métodos:
//   1) digitar os KM rodados; ou
//   2) informar odômetro inicial e final (o app calcula).
// ---------------------------------------------------------------
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/theme';
import { CampoTexto, Segmentos, Botao, Chips } from './ui';
import { parseValor, MESES_ABREV, formatNumero } from '../utils/format';

/**
 * props:
 * - inicial: registro da tabela meses (edição) ou null
 * - anoPadrao, mesPadrao: pré-seleção do período
 * - onSalvar({ano, mes, kmDireto, odometroInicio, odometroFim, observacao})
 */
export default function KmForm({ inicial, anoPadrao, mesPadrao, onSalvar }) {
  const { cores } = useTheme();
  const hoje = new Date();

  const [ano, setAno] = useState(inicial?.ano ?? anoPadrao ?? hoje.getFullYear());
  const [mes, setMes] = useState(inicial?.mes ?? mesPadrao ?? hoje.getMonth() + 1);
  const [metodo, setMetodo] = useState(
    inicial?.odometro_inicio !== null && inicial?.odometro_inicio !== undefined ? 'odometro' : 'direto'
  );
  const [kmDireto, setKmDireto] = useState(
    inicial && (inicial.odometro_inicio === null || inicial.odometro_inicio === undefined)
      ? String(inicial.km_rodados).replace('.', ',') : ''
  );
  const [odoInicio, setOdoInicio] = useState(
    inicial?.odometro_inicio != null ? String(inicial.odometro_inicio).replace('.', ',') : ''
  );
  const [odoFim, setOdoFim] = useState(
    inicial?.odometro_fim != null ? String(inicial.odometro_fim).replace('.', ',') : ''
  );
  const [observacao, setObservacao] = useState(inicial?.observacao || '');
  const [erro, setErro] = useState(null);

  // Anos disponíveis para lançamento: do ano passado ao próximo
  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1];
  if (inicial && !anos.includes(inicial.ano)) anos.unshift(inicial.ano);

  // Pré-visualização do cálculo pelo odômetro
  const previewKm = (() => {
    if (metodo !== 'odometro') return null;
    const i = parseValor(odoInicio);
    const f = parseValor(odoFim);
    if (isNaN(i) || isNaN(f)) return null;
    return f - i;
  })();

  function salvar() {
    setErro(null);
    if (metodo === 'direto') {
      const km = parseValor(kmDireto);
      if (kmDireto.trim() === '' || isNaN(km)) return setErro('Informe os KM rodados.');
      if (km < 0) return setErro('Os quilômetros não podem ser negativos.');
      onSalvar({ ano, mes, kmDireto: km, odometroInicio: null, odometroFim: null, observacao });
    } else {
      const i = parseValor(odoInicio);
      const f = parseValor(odoFim);
      if (odoInicio.trim() === '' || isNaN(i) || odoFim.trim() === '' || isNaN(f)) {
        return setErro('Informe o odômetro inicial e o final.');
      }
      if (i < 0 || f < 0) return setErro('O odômetro não pode ser negativo.');
      if (f < i) return setErro('O odômetro final deve ser maior ou igual ao inicial.');
      onSalvar({ ano, mes, kmDireto: null, odometroInicio: i, odometroFim: f, observacao });
    }
  }

  return (
    <View>
      {/* Período */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
        Período
      </Text>
      <Chips opcoes={anos.map((a) => ({ id: a, label: String(a) }))} valor={ano} onChange={setAno} />
      <Chips
        opcoes={MESES_ABREV.map((m, i) => ({ id: i + 1, label: m }))}
        valor={mes}
        onChange={setMes}
      />
      <View style={{ height: 10 }} />

      {/* Método de registro */}
      <Segmentos
        opcoes={[
          { id: 'direto', label: 'Digitar KM' },
          { id: 'odometro', label: 'Odômetro início/fim' },
        ]}
        valor={metodo}
        onChange={setMetodo}
        style={{ marginBottom: 14 }}
      />

      {metodo === 'direto' ? (
        <CampoTexto
          rotulo="KM rodados no mês *"
          valor={kmDireto}
          onChange={setKmDireto}
          placeholder="Ex.: 1450"
          teclado="decimal-pad"
          sufixo="km"
        />
      ) : (
        <View>
          <CampoTexto
            rotulo="Odômetro no início do mês *"
            valor={odoInicio}
            onChange={setOdoInicio}
            placeholder="Ex.: 24500"
            teclado="decimal-pad"
            sufixo="km"
          />
          <CampoTexto
            rotulo="Odômetro no fim do mês *"
            valor={odoFim}
            onChange={setOdoFim}
            placeholder="Ex.: 25980"
            teclado="decimal-pad"
            sufixo="km"
          />
          {previewKm !== null ? (
            <Text
              style={{
                fontSize: 14, fontWeight: '700', marginBottom: 10,
                color: previewKm < 0 ? cores.danger : cores.primary,
              }}
            >
              {previewKm < 0
                ? 'Atenção: o odômetro final é menor que o inicial.'
                : `KM calculados: ${formatNumero(previewKm)} km`}
            </Text>
          ) : null}
        </View>
      )}

      <CampoTexto
        rotulo="Observação (opcional)"
        valor={observacao}
        onChange={setObservacao}
        placeholder="Ex.: inclui viagem a Curitiba"
      />

      {erro ? (
        <Text style={{ color: cores.danger, fontSize: 13, marginBottom: 10, fontWeight: '600' }}>
          {erro}
        </Text>
      ) : null}

      <Botao titulo="Salvar quilometragem" icone="speedometer-outline" onPress={salvar} />
    </View>
  );
}
