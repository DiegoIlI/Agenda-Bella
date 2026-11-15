import { Sheet } from '../components/ui.jsx';

export function PrivacyNotice({ salon, onClose }) {
  return (
    <Sheet title="Aviso de privacidad" onClose={onClose}>
      <div className="prose">
        <p><b>{salon.salon_name}</b> es responsable de tus datos personales.</p>
        <p><b>Qué datos pedimos:</b> tu nombre, tu número de celular, el servicio, la fecha y la hora de tu cita.</p>
        <p><b>Para qué los usamos:</b> únicamente para agendar y administrar tu cita, contactarte si hay cambios y, solo si lo autorizas, enviarte un recordatorio por WhatsApp el día anterior.</p>
        <p><b>Quién los ve:</b> solo el personal del salón. No vendemos ni compartimos tus datos con terceros, salvo los proveedores técnicos necesarios para operar la aplicación (alojamiento de la base de datos y, si lo autorizas, el envío de WhatsApp).</p>
        <p><b>Tus derechos:</b> puedes pedir que corrijamos o eliminemos tus datos, o retirar el permiso de WhatsApp en cualquier momento, escribiendo al WhatsApp del salón{salon.whatsapp_phone ? ` (${salon.whatsapp_phone})` : ''}. También puedes cancelar tu cita desde tu comprobante.</p>
        <p className="muted">Texto base de la aplicación. El salón puede ajustarlo a su situación legal.</p>
      </div>
    </Sheet>
  );
}
