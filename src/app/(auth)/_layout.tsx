import { Stack } from "expo-router";

const AUTH_BG = "#090910";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
        contentStyle: {
          backgroundColor: AUTH_BG,
        },
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{
          animation: "fade",
        }}
      />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}