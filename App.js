import React from 'react';
import { StatusBar } from 'expo-status-bar';
import LandingPage from './src/screens/LandingPage';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <LandingPage />
    </>
  );
}
