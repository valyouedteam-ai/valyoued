import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

/**
 * MVP mobile shell: full web parity by embedding the production ValYoued URL.
 * Set EXPO_PUBLIC_VALYOUED_WEB_URL to your deployed web app (same Clerk instance).
 */
const WEB_URL = process.env.EXPO_PUBLIC_VALYOUED_WEB_URL ?? "http://127.0.0.1:5173";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <WebView
          source={{ uri: WEB_URL }}
          style={styles.web}
          allowsBackForwardNavigationGestures
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled={Platform.OS === "ios"}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0f1a" },
  web: { flex: 1 },
});
