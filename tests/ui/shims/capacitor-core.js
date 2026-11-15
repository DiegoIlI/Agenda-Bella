// Simulador de @capacitor/core para pruebas. window.__NATIVE__=true simula la app nativa (IPA) y registra las llamadas.
export const Capacitor = { isNativePlatform: () => !!window.__NATIVE__ };
export const registerPlugin = name => new Proxy({}, { get: (_, method) => async args => {
  (window.__capCalls ||= []).push({ plugin: name, method, args });
  if (method === 'requestPermissions') return { display: window.__NOTIF_PERMISSION || 'granted' };
  return {};
} });
