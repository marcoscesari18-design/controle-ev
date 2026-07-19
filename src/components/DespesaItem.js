// ---------------------------------------------------------------
// Item de despesa exibido nas listas (Dashboard e Histórico),
// com ações de editar, duplicar e excluir.
// ---------------------------------------------------------------
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';
import { formatMoeda, formatData } from '../utils/format';
import { getCategoria } from '../utils/categorias';

export default function DespesaItem({ despesa, onEditar, onDuplicar, onExcluir }) {
  const { cores } = useTheme();
  const cat = getCategoria(despesa.categoria);
  const reembolsada = despesa.reembolso === 'reembolsado';

  return (
    <View
      style={{
        backgroundColor: cores.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: cores.border,
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Ícone da categoria */}
        <View
          style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: cat.cor + '22',
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}
        >
          <Ionicons name={cat.icone} size={20} color={cat.cor} />
        </View>

        {/* Dados principais */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: cores.text }} numberOfLines={1}>
            {despesa.descricao || cat.label}
          </Text>
          <Text style={{ fontSize: 12, color: cores.textSecondary, marginTop: 1 }}>
            {formatData(despesa.data)} · {cat.label}
            {despesa.local ? ` · ${despesa.local}` : ''}
            {despesa.kwh ? ` · ${despesa.kwh} kWh` : ''}
          </Text>
        </View>

        {/* Valor + situação */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: cores.text }}>
            {formatMoeda(despesa.valor)}
          </Text>
          <View
            style={{
              paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 3,
              backgroundColor: reembolsada ? cores.primaryContainer : cores.surfaceVariant,
            }}
          >
            <Text
              style={{
                fontSize: 10, fontWeight: '700',
                color: reembolsada ? cores.onPrimaryContainer : cores.textSecondary,
              }}
            >
              {reembolsada ? 'Reembolsada' : 'Paga por mim'}
            </Text>
          </View>
        </View>
      </View>

      {/* Ações */}
      <View
        style={{
          flexDirection: 'row', justifyContent: 'flex-end', gap: 4,
          marginTop: 8, borderTopWidth: 1, borderTopColor: cores.border, paddingTop: 6,
        }}
      >
        <AcaoBotao icone="create-outline" rotulo="Editar" onPress={onEditar} />
        {onDuplicar ? <AcaoBotao icone="copy-outline" rotulo="Duplicar" onPress={onDuplicar} /> : null}
        <AcaoBotao icone="trash-outline" rotulo="Excluir" onPress={onExcluir} perigo />
      </View>
    </View>
  );
}

function AcaoBotao({ icone, rotulo, onPress, perigo }) {
  const { cores } = useTheme();
  const cor = perigo ? cores.danger : cores.primary;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
    >
      <Ionicons name={icone} size={16} color={cor} />
      <Text style={{ color: cor, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>{rotulo}</Text>
    </Pressable>
  );
}
