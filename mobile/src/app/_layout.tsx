import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';

export default function RootLayout() {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F4F6F8' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
      </Stack>
    </>
  );
}