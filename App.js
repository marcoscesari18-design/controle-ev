// ---------------------------------------------------------------
// Controle EV — aplicativo 100% offline para controle de
// quilometragem profissional e despesas de veículo elétrico.
//
// Estrutura: 5 abas fixas (Início, Lançar, Histórico, Relatórios,
// Configurações). Dados em SQLite local. Nada sai do aparelho sem
// ação manual do usuário (compartilhar PDF ou backup).
// ---------------------------------------------------------------
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/database/db';
import { getConfig } from './src/services/configService';
import { ThemeProvider, useTheme } from './src/theme/theme';

import InicioScreen from './src/screens/InicioScreen';
import LancarScreen from './src/screens/LancarScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import RelatoriosScreen from './src/screens/RelatoriosScreen';
import ConfiguracoesScreen from './src/screens/ConfiguracoesScreen';

// Inicializa o banco (migrações + configurações padrão) antes de
// qualquer tela renderizar. A API síncrona garante que tudo está
// pronto quando o React montar os componentes.
initDatabase();
const temaSalvo = getConfig().tema;

const Tab = createBottomTabNavigator();

const ICONES = {
  Início: 'home',
  Lançar: 'add-circle',
  Histórico: 'time',
  Relatórios: 'document-text',
  Configurações: 'settings',
};

function Navegacao() {
  const { cores, escuro } = useTheme();

  // Integra as cores do tema com o React Navigation
  const temaNav = {
    ...(escuro ? DarkTheme : DefaultTheme),
    colors: {
      ...(escuro ? DarkTheme.colors : DefaultTheme.colors),
      background: cores.background,
      card: cores.tabBar,
      primary: cores.primary,
      text: cores.text,
      border: cores.border,
    },
  };

  return (
    <NavigationContainer theme={temaNav}>
      <StatusBar style={escuro ? 'light' : 'dark'} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: cores.primary,
          tabBarInactiveTintColor: cores.textSecondary,
          tabBarStyle: {
            backgroundColor: cores.tabBar,
            borderTopColor: cores.border,
            height: 62,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONES[route.name] : `${ICONES[route.name]}-outline`}
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Início" component={InicioScreen} />
        <Tab.Screen name="Lançar" component={LancarScreen} />
        <Tab.Screen name="Histórico" component={HistoricoScreen} />
        <Tab.Screen name="Relatórios" component={RelatoriosScreen} />
        <Tab.Screen name="Configurações" component={ConfiguracoesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider preferenciaInicial={temaSalvo}>
        <Navegacao />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
