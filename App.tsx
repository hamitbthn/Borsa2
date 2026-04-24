import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { SwingRadarScreen } from './src/screens/SwingRadarScreen';

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#121212' }}>
      <StatusBar style="light" />
      <SwingRadarScreen />
    </View>
  );
}
