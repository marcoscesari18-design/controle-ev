// ---------------------------------------------------------------
// Componentes básicos de interface (Material Design 3).
// Componentes grandes, de toque fácil, com tema claro/escuro.
// ---------------------------------------------------------------
import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/theme';

/** Cartão com sombra suave */
export function Card({ children, style }) {
  const { cores } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: cores.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: cores.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Título de seção */
export function Titulo({ children, style }) {
  const { cores } = useTheme();
  return (
    <Text style={[{ fontSize: 16, fontWeight: '700', color: cores.text, marginBottom: 8 }, style]}>
      {children}
    </Text>
  );
}

/** Botão principal (grande, MD3) */
export function Botao({ titulo, onPress, icone, variante = 'primario', desabilitado, style }) {
  const { cores } = useTheme();
  const cfg = {
    primario: { bg: cores.primary, fg: cores.onPrimary, borda: cores.primary },
    tonal: { bg: cores.primaryContainer, fg: cores.onPrimaryContainer, borda: cores.primaryContainer },
    contorno: { bg: 'transparent', fg: cores.primary, borda: cores.primary },
    perigo: { bg: cores.danger, fg: cores.onDanger, borda: cores.danger },
  }[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={desabilitado}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [
        estilos.botao,
        {
          backgroundColor: cfg.bg,
          borderColor: cfg.borda,
          opacity: desabilitado ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {icone ? <Ionicons name={icone} size={20} color={cfg.fg} style={{ marginRight: 8 }} /> : null}
      <Text style={{ color: cfg.fg, fontSize: 16, fontWeight: '600' }}>{titulo}</Text>
    </Pressable>
  );
}

/** Campo de texto com rótulo */
export function CampoTexto({
  rotulo, valor, onChange, placeholder, teclado = 'default',
  multiline = false, erro, sufixo, style,
}) {
  const { cores } = useTheme();
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {rotulo ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: cores.textSecondary, marginBottom: 4 }}>
          {rotulo}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: cores.inputBg,
          borderWidth: 1.5,
          borderColor: erro ? cores.danger : cores.border,
          borderRadius: 12,
          paddingHorizontal: 12,
        }}
      >
        <TextInput
          value={valor}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={cores.textSecondary}
          keyboardType={teclado}
          multiline={multiline}
          style={{
            flex: 1,
            fontSize: 17,
            color: cores.text,
            paddingVertical: multiline ? 10 : 12,
            minHeight: multiline ? 70 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />
        {sufixo ? <Text style={{ color: cores.textSecondary, fontSize: 15 }}>{sufixo}</Text> : null}
      </View>
      {erro ? <Text style={{ color: cores.danger, fontSize: 12, marginTop: 3 }}>{erro}</Text> : null}
    </View>
  );
}

/** Controle segmentado (alternador de opções) */
export function Segmentos({ opcoes, valor, onChange, style }) {
  const { cores } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: cores.surfaceVariant,
          borderRadius: 12,
          padding: 4,
        },
        style,
      ]}
    >
      {opcoes.map((op) => {
        const ativo = op.id === valor;
        return (
          <Pressable
            key={op.id}
            onPress={() => onChange(op.id)}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 9,
              alignItems: 'center',
              backgroundColor: ativo ? cores.primary : 'transparent',
            }}
          >
            <Text
              style={{
                color: ativo ? cores.onPrimary : cores.text,
                fontWeight: ativo ? '700' : '500',
                fontSize: 13,
                textAlign: 'center',
              }}
              numberOfLines={2}
            >
              {op.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Fileira horizontal de chips selecionáveis (categorias, meses etc.) */
export function Chips({ opcoes, valor, onChange, permitirTodos = false, rotuloTodos = 'Todos' }) {
  const { cores } = useTheme();
  const lista = permitirTodos ? [{ id: null, label: rotuloTodos }, ...opcoes] : opcoes;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
        {lista.map((op) => {
          const ativo = op.id === valor;
          return (
            <Pressable
              key={String(op.id)}
              onPress={() => onChange(op.id)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 20,
                backgroundColor: ativo ? cores.primary : cores.chipBg,
                borderWidth: 1,
                borderColor: ativo ? cores.primary : cores.border,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {op.icone ? (
                <Ionicons
                  name={op.icone}
                  size={15}
                  color={ativo ? cores.onPrimary : cores.textSecondary}
                  style={{ marginRight: 5 }}
                />
              ) : null}
              <Text style={{ color: ativo ? cores.onPrimary : cores.text, fontSize: 13, fontWeight: '600' }}>
                {op.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

/** Estado vazio amigável */
export function EstadoVazio({ icone = 'file-tray-outline', titulo, mensagem }) {
  const { cores } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28 }}>
      <Ionicons name={icone} size={44} color={cores.textSecondary} />
      <Text style={{ fontSize: 15, fontWeight: '700', color: cores.text, marginTop: 10 }}>
        {titulo}
      </Text>
      {mensagem ? (
        <Text style={{ fontSize: 13, color: cores.textSecondary, marginTop: 4, textAlign: 'center' }}>
          {mensagem}
        </Text>
      ) : null}
    </View>
  );
}

/** Cartão de indicador (KPI) do dashboard */
export function KpiCard({ rotulo, valor, icone, cor, largura = '48%' }) {
  const { cores } = useTheme();
  return (
    <View
      style={{
        width: largura,
        backgroundColor: cores.surface,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: cores.border,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Ionicons name={icone} size={16} color={cor || cores.primary} />
        <Text
          style={{ fontSize: 12, color: cores.textSecondary, marginLeft: 6, flex: 1 }}
          numberOfLines={1}
        >
          {rotulo}
        </Text>
      </View>
      <Text style={{ fontSize: 18, fontWeight: '800', color: cores.text }} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    minHeight: 52,
  },
});
