// ---------------------------------------------------------------
// Formulário de despesa — usado para criar (aba Lançar) e para
// editar (modal no Histórico/Início).
// Aplica as regras por categoria:
//  - recarga_casa: mostra somente o valor (sem kWh, sem local)
//  - recarga_fora: kWh e local opcionais
// ---------------------------------------------------------------
import React, { useState } from 'react';
import { View, Text, Image, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File, Paths } from 'expo-file-system';
import { useTheme } from '../theme/theme';
import { CampoTexto, Chips, Segmentos, Botao } from './ui';
import { CATEGORIAS, SITUACOES, camposDaCategoria } from '../utils/categorias';
import { parseValor, parseDataBR, formatData, hojeISO, formatNumero } from '../utils/format';

/**
 * props:
 * - inicial: despesa existente (edição) ou null (nova)
 * - padraoReembolso: 'pago' | 'reembolsado' (config)
 * - onSalvar(dados): recebe os dados validados/convertidos
 * - rotuloBotao: texto do botão de salvar
 */
export default function DespesaForm({ inicial, padraoReembolso = 'pago', onSalvar, rotuloBotao = 'Salvar despesa' }) {
  const { cores } = useTheme();

  const [categoria, setCategoria] = useState(inicial?.categoria || 'recarga_fora');
  const [valor, setValor] = useState(
    inicial ? String(inicial.valor).replace('.', ',') : ''
  );
  const [dataBR, setDataBR] = useState(inicial ? formatData(inicial.data) : formatData(hojeISO()));
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [local, setLocal] = useState(inicial?.local || '');
  const [kwh, setKwh] = useState(inicial?.kwh ? String(inicial.kwh).replace('.', ',') : '');
  const [reembolso, setReembolso] = useState(inicial?.reembolso || padraoReembolso);
  const [foto, setFoto] = useState(inicial?.anexo_foto || null);
  const [erros, setErros] = useState({});

  const regras = camposDaCategoria(categoria);

  // ------------------- foto opcional -------------------
  async function escolherFoto(daCamera) {
    try {
      let resultado;
      if (daCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permissão negada', 'Autorize o uso da câmera para fotografar o comprovante.');
          return;
        }
        resultado = await ImagePicker.launchCameraAsync({ quality: 0.6 });
      } else {
        resultado = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.6,
        });
      }
      if (resultado.canceled || !resultado.assets?.length) return;

      // Copia a foto para a pasta do app (a original pode ser apagada pelo usuário)
      const origem = resultado.assets[0].uri;
      const nome = `comprovante-${Date.now()}.jpg`;
      const destino = new File(Paths.document, nome);
      new File(origem).copySync(destino);
      setFoto(destino.uri);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível anexar a foto: ' + e.message);
    }
  }

  // ------------------- salvar -------------------
  function salvar() {
    const novosErros = {};

    const v = parseValor(valor);
    if (valor.trim() === '') novosErros.valor = 'Informe o valor.';
    else if (isNaN(v)) novosErros.valor = 'Valor inválido.';
    else if (v < 0) novosErros.valor = 'O valor não pode ser negativo.';
    else if (v === 0) novosErros.valor = 'O valor não pode ser zero.';

    const dataISO = parseDataBR(dataBR);
    if (!dataISO) novosErros.data = 'Data inválida. Use o formato dd/mm/aaaa.';

    let kwhNum = null;
    if (regras.mostraKwh && kwh.trim() !== '') {
      kwhNum = parseValor(kwh);
      if (isNaN(kwhNum) || kwhNum < 0) novosErros.kwh = 'kWh inválido.';
    }

    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    onSalvar({
      data: dataISO,
      categoria,
      valor: v,
      descricao: descricao.trim() || null,
      local: regras.mostraLocal ? (local.trim() || null) : null,
      kwh: regras.mostraKwh ? kwhNum : null,
      reembolso,
      anexo_foto: foto,
    });
  }

  return (
    <View>
      {/* Categoria */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
        Categoria
      </Text>
      <Chips
        opcoes={CATEGORIAS.map((c) => ({ id: c.id, label: c.label, icone: c.icone }))}
        valor={categoria}
        onChange={setCategoria}
      />
      <View style={{ height: 10 }} />

      {/* Valor */}
      <CampoTexto
        rotulo="Valor (R$) *"
        valor={valor}
        onChange={setValor}
        placeholder="0,00"
        teclado="decimal-pad"
        erro={erros.valor}
      />

      {/* Data */}
      <CampoTexto
        rotulo="Data *"
        valor={dataBR}
        onChange={setDataBR}
        placeholder="dd/mm/aaaa"
        teclado="numbers-and-punctuation"
        erro={erros.data}
      />

      {/* kWh e Local — apenas para recarga fora de casa */}
      {regras.mostraKwh ? (
        <CampoTexto
          rotulo="Energia (kWh) — opcional"
          valor={kwh}
          onChange={setKwh}
          placeholder="Ex.: 32,5"
          teclado="decimal-pad"
          erro={erros.kwh}
        />
      ) : null}
      {regras.mostraLocal ? (
        <CampoTexto
          rotulo="Local — opcional"
          valor={local}
          onChange={setLocal}
          placeholder="Ex.: Eletroposto do shopping"
        />
      ) : null}

      {/* Descrição */}
      <CampoTexto
        rotulo="Descrição"
        valor={descricao}
        onChange={setDescricao}
        placeholder="Ex.: Recarga em viagem a trabalho"
      />

      {/* Situação financeira */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
        Situação *
      </Text>
      <Segmentos
        opcoes={SITUACOES.map((s) => ({ id: s.id, label: s.label }))}
        valor={reembolso}
        onChange={setReembolso}
        style={{ marginBottom: 14 }}
      />

      {/* Foto opcional do comprovante */}
      <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 6 }}>
        Comprovante (opcional)
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <Pressable
          onPress={() => escolherFoto(true)}
          style={{ padding: 12, borderRadius: 12, backgroundColor: cores.chipBg, borderWidth: 1, borderColor: cores.border }}
        >
          <Ionicons name="camera-outline" size={22} color={cores.primary} />
        </Pressable>
        <Pressable
          onPress={() => escolherFoto(false)}
          style={{ padding: 12, borderRadius: 12, backgroundColor: cores.chipBg, borderWidth: 1, borderColor: cores.border }}
        >
          <Ionicons name="image-outline" size={22} color={cores.primary} />
        </Pressable>
        {foto ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FotoMiniatura uri={foto} />
            <Pressable onPress={() => setFoto(null)} style={{ marginLeft: 8 }}>
              <Ionicons name="close-circle" size={22} color={cores.danger} />
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: cores.textSecondary, fontSize: 12 }}>Nenhuma foto anexada</Text>
        )}
      </View>

      <Botao titulo={rotuloBotao} icone="checkmark-circle-outline" onPress={salvar} />
    </View>
  );
}

/** Miniatura da foto — trata o caso do arquivo ter sido removido */
function FotoMiniatura({ uri }) {
  const { cores } = useTheme();
  const [erro, setErro] = useState(false);
  let existe = true;
  try {
    existe = new File(uri).exists;
  } catch (e) {
    existe = false;
  }
  if (!existe || erro) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="alert-circle-outline" size={18} color={cores.warning} />
        <Text style={{ color: cores.textSecondary, fontSize: 11, marginLeft: 4 }}>
          Foto não encontrada
        </Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      onError={() => setErro(true)}
      style={{ width: 48, height: 48, borderRadius: 8 }}
    />
  );
}
