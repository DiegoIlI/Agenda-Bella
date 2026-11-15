import { mode } from '../config.js';
import { liveApi } from './live.js';
import { demoApi } from './demo.js';

// En modo 'unconfigured' no se expone ninguna operación real: la interfaz muestra la pantalla de configuración pendiente.
const unconfigured = new Proxy({ mode: 'unconfigured' }, { get: (t, k) => (k in t ? t[k] : async () => { throw new Error('La aplicación aún no está conectada a la base de datos.'); }) });
export const api = mode === 'live' ? liveApi : mode === 'demo' ? demoApi : unconfigured;
export { mode };
