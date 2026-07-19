// ---------------------------------------------------------------
// Tema do aplicativo — Material Design 3 (claro e escuro).
// O tema escolhido fica salvo nas configurações (SQLite).
// ---------------------------------------------------------------
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export const TEMA_CLARO = {
  nome: 'claro',
  background: '#F6FAF6',
  surface: '#FFFFFF',
  surfaceVariant: '#E9F1E9',
  primary: '#1B7F4C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D2F0DD',
  onPrimaryContainer: '#0A3A22',
  text: '#191C19',
  textSecondary: '#54615A',
  border: '#DAE5DC',
  danger: '#BA1A1A',
  onDanger: '#FFFFFF',
  success: '#1B7F4C',
  warning: '#9A6A00',
  chipBg: '#E4EEE6',
  inputBg: '#FFFFFF',
  tabBar: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.08)',
};

export const TEMA_ESCURO = {
  nome: 'escuro',
  background: '#101410',
  surface: '#1B211C',
  surfaceVariant: '#26302A',
  primary: '#7FD9A4',
  onPrimary: '#00391E',
  primaryContainer: '#175236',
  onPrimaryContainer: '#BFF0D2',
  text: '#E1E5DF',
  textSecondary: '#A4B0A6',
  border: '#37413A',
  danger: '#FFB4AB',
  onDanger: '#690005',
  success: '#7FD9A4',
  warning: '#F0C15C',
  chipBg: '#26302A',
  inputBg: '#232B25',
  tabBar: '#171D18',
  shadow: 'rgba(0,0,0,0.4)',
};

const ThemeContext = createContext(null);

/**
 * Provider do tema. `preferencia` pode ser: 'sistema' | 'claro' | 'escuro'.
 * A preferência inicial é lida do banco pelo App.js e passada aqui.
 */
export function ThemeProvider({ children, preferenciaInicial = 'sistema' }) {
  const esquemaSistema = useColorScheme(); // 'light' | 'dark' | null
  const [preferencia, setPreferencia] = useState(preferenciaInicial);

  const value = useMemo(() => {
    const escuro =
      preferencia === 'escuro' ||
      (preferencia === 'sistema' && esquemaSistema === 'dark');
    return {
      cores: escuro ? TEMA_ESCURO : TEMA_CLARO,
      escuro,
      preferencia,
      setPreferencia,
    };
  }, [preferencia, esquemaSistema]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook para acessar o tema em qualquer tela/componente */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
