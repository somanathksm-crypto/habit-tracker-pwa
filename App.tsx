import './src/lib/disableFontScaling';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DataProvider } from './src/lib/store';
import { configureNotificationHandler } from './src/lib/notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { usePaperTheme } from './src/theme';

configureNotificationHandler();

export default function App() {
  const theme = usePaperTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <DataProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </DataProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
