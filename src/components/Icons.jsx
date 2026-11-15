import { Scissors, Paintbrush, Sparkles, Droplets, Flower2, Hand, Heart } from 'lucide-react';

const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export function WhatsAppIcon({ size = 20, ...p }) {
  return (<svg {...base} width={size} height={size} strokeWidth={1.6} {...p}>
    <path d="M3.5 20.5l1.3-4.6A8.5 8.5 0 1 1 8.2 19.3z" />
    <path d="M9 8.6c.2-.5.6-.5.9-.4.2.5.6 1.3.5 1.6-.1.4-.6.8-.5 1.1.5 1 1.4 1.9 2.5 2.4.3.1.7-.5 1-.6.3-.1 1 .3 1.5.6.1.3-.1 1-.7 1.3-.7.3-1.9.1-3.4-.9-1.5-1-2.6-2.4-2.9-3.6-.1-.5 0-1.5.5-1.9z" fill="currentColor" stroke="none" />
  </svg>);
}
export function HairWaveIcon({ size = 24, ...p }) {
  return (<svg {...base} width={size} height={size} {...p}>
    <path d="M8 3c-2 3 2 5 0 8s2 5 0 10" /><path d="M12.5 3c-2 3 2 5 0 8s2 5 0 10" /><path d="M17 3c-2 3 2 5 0 8s2 5 0 10" />
  </svg>);
}
export function PolishIcon({ size = 24, ...p }) {
  return (<svg {...base} width={size} height={size} {...p}>
    <rect x="7" y="10" width="10" height="11" rx="2.5" /><path d="M10 10V7.5h4V10" /><path d="M11 7.5V3h2v4.5" />
  </svg>);
}
export function LotusMark({ size = 30, ...p }) {
  return (<svg viewBox="0 0 48 40" width={size} height={size * 40 / 48} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M24 5c-5 6-5 15 0 24 5-9 5-18 0-24z" />
    <path d="M24 29C17 27 11 20 10 10c6 1 11 6 14 13" /><path d="M24 29c7-2 13-9 14-19-6 1-11 6-14 13" />
    <path d="M24 31C14 31 6 25 3 16c6 0 11 3 15 8" /><path d="M24 31c10 0 18-6 21-15-6 0-11 3-15 8" />
    <path d="M12 35c6 3 18 3 24 0" />
  </svg>);
}

export const SERVICE_ICONS = {
  scissors: Scissors, brush: Paintbrush, hairwave: HairWaveIcon, polish: PolishIcon, sparkles: Sparkles, droplets: Droplets, flower: Flower2, hand: Hand, heart: Heart,
};
export const ICON_CHOICES = [['scissors', 'Tijeras'], ['brush', 'Pincel'], ['hairwave', 'Ondas'], ['flower', 'Flor'], ['polish', 'Esmalte'], ['sparkles', 'Brillo'], ['droplets', 'Gotas'], ['hand', 'Mano'], ['heart', 'Corazón']];
export function ServiceIcon({ name, size = 22 }) {
  const C = SERVICE_ICONS[name] || Sparkles;
  return <C size={size} strokeWidth={1.7} />;
}
