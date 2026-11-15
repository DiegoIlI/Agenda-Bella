/**
 * Personalización del sitio público.
 * Cambia estos valores cuando la estilista confirme los datos del negocio.
 * No inventar domicilio, reseñas, precios, certificaciones ni fotos reales.
 */
export const BUSINESS = {
  name: 'Agenda Bella',
  subtitle: 'BEAUTY STUDIO',
  headline: 'Tu belleza merece su momento.',
  city: 'Mérida, Yucatán',
  whatsapp: '529997666778',
  displayPhone: '999 766 6778',
  address: '', // Anotar dirección cuando la confirmen; no mostrar dirección falsa.
  instagram: '', // Ejemplo: 'https://www.instagram.com/cuenta/'
  facebook: '',
  bookingPath: '/reservar/', // La app está publicada en el MISMO sitio, bajo /reservar/
  hoursText: 'Consulta los horarios disponibles en la agenda',
};

export const SERVICES = [
  {
    id: 'cabello', eyebrow: '01 / BELLEZA CAPILAR', title: 'Cortes & peinados',
    body: 'Un cambio sutil o una transformación: encuentra el estilo que va contigo.',
    img: '/images/peinado-profesional.webp', alt: 'Peinado con ondas realizado en un salón, imagen ilustrativa',
  },
  {
    id: 'color', eyebrow: '02 / COLOR & LUZ', title: 'Color & balayage',
    body: 'Matices, reflejos y técnicas de color para un resultado lleno de personalidad.',
    img: '/images/color-balayage.webp', alt: 'Técnica de coloración de cabello, imagen ilustrativa',
  },
  {
    id: 'manicura', eyebrow: '03 / DETALLES QUE ENAMORAN', title: 'Manicura & uñas',
    body: 'Diseños cuidados y acabados elegantes para cada ocasión.',
    img: '/images/unas-manicura.webp', alt: 'Manicura rosa empolvado, imagen ilustrativa',
  },
];

export const GALLERY = [
  { src: '/images/color-balayage.webp', label: 'Color & luz', alt: 'Aplicación de color en cabello (imagen ilustrativa)' },
  { src: '/images/unas-manicura.webp', label: 'Detalles', alt: 'Uñas con manicura rosa (imagen ilustrativa)' },
  { src: '/images/salon-interior.webp', label: 'Nuestro universo', alt: 'Concepto de interior de salón de belleza (imagen ilustrativa)' },
  { src: '/images/peinado-profesional.webp', label: 'Estilo', alt: 'Peinado con ondas (imagen ilustrativa)' },
];

export const QUESTIONS = [
  { q: '¿Necesito crear una cuenta para reservar?', a: 'No. Puedes elegir el servicio, la fecha y el horario, y registrar tu nombre completo y teléfono. Crear una cuenta es opcional.' },
  { q: '¿Cómo sé qué horarios están disponibles?', a: 'Al tocar “Reservar cita” verás los días y las horas libres según el servicio elegido. Los horarios ocupados no se pueden seleccionar.' },
  { q: '¿Puedo escribir antes de agendar?', a: '¡Claro! Puedes contactarnos directamente por WhatsApp al número que aparece en esta página.' },
  { q: '¿Puedo cancelar una cita?', a: 'La aplicación ofrece opciones para gestionar una reservación conforme a la configuración y política de cancelación del salón.' },
];
