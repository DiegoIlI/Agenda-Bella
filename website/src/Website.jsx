import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
  ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown,
  Clock3, Flower2, Heart, Menu, MessageCircle, MapPin, Phone,
  ShieldCheck, Sparkles, X, Instagram, Scissors
} from 'lucide-react';
import { BUSINESS, SERVICES, GALLERY, QUESTIONS } from './content.js';

gsap.registerPlugin(ScrollTrigger);

const waLink = (text = 'Hola, me gustaría saber más sobre sus servicios en Agenda Bella.') =>
  `https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(text)}`;
const booking = BUSINESS.bookingPath;

function Lotus({ className = '' }) {
  return (
    <svg className={className} width="51" height="51" viewBox="0 0 100 86" fill="none" aria-hidden="true">
      <path d="M50 65C41 50 36 39 38 25C39 17 43 10 50 2C57 10 61 17 62 25C64 39 59 50 50 65Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M49 66C28 62 14 48 12 28C29 27 43 36 50 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M51 66C72 62 86 48 88 28C71 27 57 36 50 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M47 69C28 72 11 60 3 45C17 41 29 45 37 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M53 69C72 72 89 60 97 45C83 41 71 45 63 55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 77C37 85 63 85 78 77" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Brand({ light = false }) {
  return <a href="#inicio" className={`brand ${light ? 'brand-light' : ''}`} aria-label="Agenda Bella · Ir al inicio">
    <Lotus className="brand-icon" />
    <span className="brand-type"><span className="brand-name">Agenda Bella</span><span className="brand-sub">BEAUTY STUDIO</span></span>
  </a>;
}

function SectionLabel({ children, light = false }) {
  return <span className={`eyebrow ${light ? 'eyebrow-light' : ''}`}><span className="eyebrow-dot" />{children}</span>;
}

function ButtonLink({ children, href = booking, secondary = false, dark = false, className = '', icon: Icon = ArrowUpRight, ...rest }) {
  return <a href={href} className={`button ${secondary ? 'button-outline' : dark ? 'button-dark' : 'button-filled'} ${className}`} {...rest}>
    <span>{children}</span><span className="button-icon"><Icon size={17} strokeWidth={1.8} /></span>
  </a>;
}

function ContactMini({ compact = false }) {
  return <a className={`whatsapp-top ${compact ? 'compact' : ''}`} href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="Escribir a Agenda Bella por WhatsApp"><MessageCircle size={19} strokeWidth={1.8} />{!compact && <span>Hablemos</span>}</a>;
}

function Header() {
  const [isOpen, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 24);
    f(); window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    const f = (ev) => { if (ev.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [isOpen]);
  const close = () => setOpen(false);
  return <header className={`header ${scrolled ? 'is-scrolled' : ''}`}>
    <div className="header-inner"><Brand />
      <nav id="main-navigation" className={`nav ${isOpen ? 'nav-open' : ''}`} aria-label="Navegación principal">
        <a href="#servicios" onClick={close}>Servicios</a>
        <a href="#nosotras" onClick={close}>Nuestra esencia</a>
        <a href="#galeria" onClick={close}>Galería</a>
        <a href="#preguntas" onClick={close}>Preguntas</a>
        <div className="nav-mobile-actions"><ButtonLink onClick={close}>Reservar mi cita</ButtonLink><ContactMini /></div>
      </nav>
      <div className="header-actions"><ContactMini compact /><a className="header-book" href={booking}>Reservar <ArrowUpRight size={16} /></a></div>
      <button className="mobile-toggle" type="button" aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={isOpen} aria-controls="main-navigation" onClick={() => setOpen(!isOpen)}>{isOpen ? <X size={27} /> : <Menu size={27} />}</button>
    </div>
  </header>;
}

function Hero() {
  return <section className="hero" id="inicio" aria-labelledby="hero-title">
    <div className="hero-decor hero-decor-left" aria-hidden="true" />
    <div className="hero-inner wrapper">
      <div className="hero-copy">
        <div className="hero-topline" data-hero><SectionLabel>UN ESPACIO PARA TI</SectionLabel><span className="hero-issue">EST. EN MÉRIDA, YUCATÁN</span></div>
        <h1 id="hero-title" data-hero>Tu belleza<br />merece <em>su<br />momento.</em><Sparkles className="hero-title-star" size={29} strokeWidth={1.35} aria-hidden="true" /></h1>
        <p className="hero-description" data-hero>Un lugar donde cada detalle habla de ti. Cabello, color, uñas y esos pequeños rituales que nos hacen sentir increíbles.</p>
        <div className="hero-buttons" data-hero><ButtonLink>Reservar mi cita</ButtonLink><a className="text-link" href="#servicios">Conoce los servicios <ArrowRight size={17}/></a></div>
        <div className="hero-caption" data-hero><div className="hero-caption-line" /><p><Heart size={16} strokeWidth={1.45} /> Tu momento especial comienza aquí.</p></div>
      </div>
      <div className="hero-visual" data-hero-image>
        <div className="hero-photo-frame"><img src="/images/salon-interior.webp" alt="Ambiente conceptual de un salón de belleza elegante; fotografía ilustrativa" fetchPriority="high" decoding="async" /><span className="hero-photo-grain" /></div>
        <div className="hero-floating-badge"><Sparkles className="badge-sparkle" size={25} strokeWidth={1.35} aria-hidden="true" /><span>BEAUTY<br /><em>rituals</em></span></div>
        <div className="hero-photo-mini"><img src="/images/unas-manicura.webp" alt="Manicura rosa de muestra" decoding="async" /><div className="mini-photo-caption">made with <span>♥</span></div></div>
        <div className="hero-photo-note">01 / 04 — UN UNIVERSO BELLA</div>
      </div>
    </div>
    <div className="hero-bottom wrapper"><a className="scroll-cue" href="#nosotras"><span className="scroll-circle"><ArrowDown size={15}/></span>DESLIZA PARA DESCUBRIR</a><span>AGENDA BELLA — BEAUTY STUDIO</span></div>
  </section>;
}

function Ticker() {
  const text = ['CABELLO & COLOR', 'PEINADOS CON ESTILO', 'MANICURA & UÑAS', 'TU MOMENTO DE BRILLAR'];
  return <div className="ticker" aria-label="Cabello, peinados, color y uñas"><div className="ticker-track" aria-hidden="true">{[0,1,2].map(n=><div className="ticker-chunk" key={n}>{text.map((t,i)=><span key={t}><Sparkles className="ticker-star" size={23} strokeWidth={1.35} aria-hidden="true" />{t}</span>)}</div>)}</div></div>;
}

function About() {
  return <section id="nosotras" className="about section-pad wrapper">
    <div className="about-side" data-reveal><SectionLabel>EL ARTE DE SENTIRTE BIEN</SectionLabel><div className="about-index">01 / NUESTRA ESENCIA</div><Lotus className="about-lotus" /></div>
    <div className="about-main" data-reveal><h2>La mejor versión de ti<br />comienza con <em>un momento<br />para ti.</em></h2><div className="about-body"><p>Creemos en la belleza que se siente. En el placer de renovar tu estilo, regalarte un descanso y salir con esa sonrisa que solo tú sabes llevar.</p><a href="#experiencia" className="text-link text-link-dark">Descubre nuestra experiencia <ArrowUpRight size={18}/></a></div></div>
  </section>;
}

function Services() {
  return <section id="servicios" className="services section-pad">
    <div className="wrapper"><div className="section-heading" data-reveal><div><SectionLabel>LO QUE HACEMOS CON AMOR</SectionLabel><h2>Tu estilo, <em>nuestro arte.</em></h2></div><p>Elige lo que más te inspira. Los precios y horarios vigentes los encontrarás al reservar.</p></div>
      <div className="service-grid">{SERVICES.map((s,i)=><a key={s.id} className={`service-card service-card-${i+1}`} href={booking} data-reveal aria-label={`Reservar ${s.title}`}>
        <div className="service-image"><img src={s.img} loading="lazy" decoding="async" alt={s.alt} /><span className="service-overlay" /><div className="service-image-index">0{i+1}</div><span className="service-arrow"><ArrowUpRight size={21}/></span></div>
        <div className="service-copy"><p className="service-eyebrow">{s.eyebrow}</p><h3>{s.title}</h3><p>{s.body}</p><span>Explorar y reservar <ArrowRight size={15}/></span></div>
      </a>)}</div>
      <div className="services-note" data-reveal><Sparkles size={21} strokeWidth={1.4}/><span>También ofrecemos pedicura, tratamientos y más opciones que puedes consultar en la agenda.</span><a href={booking}>Ver todos los servicios <ArrowUpRight size={17}/></a></div>
    </div>
  </section>;
}

function Experience() {
  const items = [
    { n:'01', icon:<Scissors size={30} strokeWidth={1.35}/>, title:'Elige tu ritual', body:'Explora los servicios y descubre lo que mejor va contigo.'},
    { n:'02', icon:<CalendarDays size={30} strokeWidth={1.35}/>, title:'Encuentra tu espacio', body:'Consulta en tiempo real las fechas y horarios disponibles.'},
    { n:'03', icon:<Heart size={30} strokeWidth={1.35}/>, title:'Nos vemos pronto', body:'Confirma tu cita y guarda sus detalles para el día especial.'},
  ];
  return <section id="experiencia" className="experience section-pad">
    <div className="wrapper experience-layout"><div className="experience-intro" data-reveal><SectionLabel light>RESERVAR ES MUY SENCILLO</SectionLabel><h2>Tu momento<br /><em>empieza aquí.</em></h2><p>Sin llamadas, sin complicaciones. Tu próxima cita, a unos cuantos clics de distancia.</p><ButtonLink className="button-cream" icon={ArrowRight}>Agendar ahora</ButtonLink><Sparkles className="experience-sprig" size={82} strokeWidth={0.9} aria-hidden="true" /></div>
      <div className="steps">{items.map(item=><div className="step" key={item.n} data-reveal><div className="step-icon">{item.icon}</div><div className="step-main"><span className="step-number">PASO {item.n}</span><h3>{item.title}</h3><p>{item.body}</p></div><ArrowUpRight className="step-arrow" size={18}/></div>)}</div>
    </div>
  </section>;
}

function Gallery() {
  const [selected,setSelected]=useState(-1);
  useEffect(()=>{
    if(selected < 0) return;
    const esc=(e)=>{if(e.key === 'Escape') setSelected(-1); if(e.key === 'ArrowRight') setSelected(v=>(v+1)%GALLERY.length); if(e.key === 'ArrowLeft') setSelected(v=>(v+GALLERY.length-1)%GALLERY.length);};
    window.addEventListener('keydown',esc);
    const prev=document.body.style.overflow; document.body.style.overflow='hidden';
    return ()=>{window.removeEventListener('keydown',esc);document.body.style.overflow=prev;};
  },[selected]);
  return <section id="galeria" className="gallery section-pad wrapper">
    <div className="gallery-heading" data-reveal><div><SectionLabel>INSPIRACIÓN BELLA</SectionLabel><h2>La belleza está<br /><em>en los detalles.</em></h2></div><p>Una pequeña mirada al universo que queremos crear contigo.</p></div>
    <div className="gallery-grid">{GALLERY.map((item,i)=><button type="button" onClick={()=>setSelected(i)} className={`gallery-tile gallery-tile-${i+1}`} key={item.src} data-reveal aria-label={`Ampliar foto: ${item.label}`}><img loading="lazy" decoding="async" src={item.src} alt={item.alt}/><span className="gallery-hover"><ArrowUpRight size={25}/></span><span className="gallery-name">{item.label}</span></button>)}</div>
    <p className="gallery-disclaimer"><span className="gallery-disclaimer-dot" /> Fotografías ilustrativas generadas para mostrar el concepto visual. Próximamente serán reemplazadas por fotos reales del salón y sus trabajos.</p>
    {selected >= 0 && <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Fotografía: ${GALLERY[selected].label}`} onClick={()=>setSelected(-1)}><button className="lightbox-close" type="button" onClick={()=>setSelected(-1)} aria-label="Cerrar fotografía"><X /></button><img src={GALLERY[selected].src} alt={GALLERY[selected].alt} onClick={e=>e.stopPropagation()} /><span>{GALLERY[selected].label} · Imagen ilustrativa</span></div>}
  </section>;
}

function Trust() {
  return <section className="trust section-pad" id="confianza"><div className="wrapper trust-layout"><div className="trust-heading" data-reveal><SectionLabel>CONFIANZA DESDE EL PRIMER HOLA</SectionLabel><h2>La tranquilidad<br />también es <em>bella.</em></h2><p>Queremos que cada paso sea claro, sencillo y cercano: desde que eliges tu servicio hasta que confirmas tu cita.</p></div>
    <div className="trust-benefits" data-reveal><div className="trust-item"><span><MessageCircle size={25}/></span><div><h3>Contacto real, sin rodeos</h3><p>Si necesitas resolver una duda, puedes escribir directamente al WhatsApp del salón.</p></div></div><div className="trust-item"><span><CalendarDays size={25}/></span><div><h3>Disponibilidad actualizada</h3><p>Los horarios se consultan desde el mismo sistema de reservaciones del salón.</p></div></div><div className="trust-item"><span><ShieldCheck size={25}/></span><div><h3>Tú decides cómo reservar</h3><p>Agenda con tu nombre y teléfono, sin obligación de abrir una cuenta.</p></div></div></div></div></section>;
}

function Faq() {
  const [open,setOpen]=useState(0);
  return <section id="preguntas" className="faq section-pad wrapper"><div className="faq-intro" data-reveal><SectionLabel>ANTES DE TU VISITA</SectionLabel><h2>Todo claro,<br /><em>todo bonito.</em></h2><p>¿Tienes alguna duda? Aquí tienes algunas respuestas rápidas.</p><ContactMini /></div>
    <div className="faq-accordion" data-reveal>{QUESTIONS.map((q,i)=><div className={`faq-entry ${open===i ? 'faq-entry-open':''}`} key={q.q}><button type="button" aria-expanded={open===i} onClick={()=>setOpen(open===i ? -1 : i)}><span>{String(i+1).padStart(2,'0')}</span>{q.q}<ChevronDown size={19}/></button>{open===i && <p>{q.a}</p>}</div>)}</div>
  </section>;
}

function FinalCTA() {
  return <section className="final-cta"><div className="wrapper final-wrap" data-reveal><div className="final-symbol" aria-hidden="true"><Lotus /></div><SectionLabel light>UN MOMENTO SOLO PARA TI</SectionLabel><h2>Hoy es un buen día<br />para <em>sentirte increíble.</em></h2><p>Tu próximo cambio de look, tu manicura favorita o simplemente un ratito para consentirte. Aquí empieza.</p><div className="final-buttons"><ButtonLink className="button-cream">Quiero reservar mi cita</ButtonLink><a className="final-whatsapp" href={waLink()} target="_blank" rel="noopener noreferrer">Tengo una pregunta <ArrowUpRight size={17}/></a></div><span className="final-outline" aria-hidden="true">BELLA</span></div></section>;
}

function Footer() {
  return <footer className="footer"><div className="wrapper footer-inner"><div className="footer-brand"><Brand/><p>Tu belleza merece su momento.<br/>Un espacio pensado para sentirte bien.</p><p className="footer-location"><MapPin size={16}/>{BUSINESS.city}</p></div>
    <div className="footer-col"><h3>EXPLORA</h3><a href="#nosotras">Nuestra esencia</a><a href="#servicios">Servicios</a><a href="#galeria">Galería</a><a href="#preguntas">Preguntas frecuentes</a></div>
    <div className="footer-col"><h3>RESERVACIONES</h3><a href={booking}>Agendar en línea</a><a href={booking+'#/cuenta'}>Mi cuenta</a><a href={waLink()} target="_blank" rel="noopener noreferrer">Escribir por WhatsApp</a></div>
    <div className="footer-col footer-contact"><h3>CONTACTO</h3><a className="footer-phone" href={waLink()} target="_blank" rel="noopener noreferrer">+52 {BUSINESS.displayPhone} <ArrowUpRight size={18}/></a><p><Clock3 size={16}/>{BUSINESS.hoursText}</p><p>{BUSINESS.address || 'Ubicación exacta: pendiente de confirmar.'}</p></div>
  </div><div className="wrapper footer-bottom"><span>© {new Date().getFullYear()} Agenda Bella. Hecho con cariño ♡</span><span>Diseño conceptual · Fotos ilustrativas hasta añadir el portafolio real</span><a href="#inicio">Volver arriba ↑</a></div></footer>;
}

export default function Website() {
  const mainRef=useRef(null);
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const onScroll=()=>{
      const dist=document.documentElement.scrollHeight-window.innerHeight;
      setProgress(dist>0 ? Math.min(100,window.scrollY/dist*100):0);
    };
    onScroll();window.addEventListener('scroll',onScroll,{passive:true});
    return ()=>window.removeEventListener('scroll',onScroll);
  },[]);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx=gsap.context(()=>{
      gsap.from('[data-hero]',{opacity:0,y:26,duration:1.05,ease:'power3.out',stagger:0.13,delay:0.13,clearProps:'all'});
      gsap.from('[data-hero-image]',{opacity:0,scale:0.975,x:24,duration:1.45,ease:'power3.out',delay:0.15,clearProps:'all'});
      gsap.utils.toArray('[data-reveal]').forEach((el)=>{
        gsap.from(el,{opacity:0,y:35,duration:0.9,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 90%',once:true},clearProps:'all'});
      });
    },mainRef);
    let lenis=null;
    let tick=null;
    if(window.matchMedia('(min-width: 900px) and (pointer:fine)').matches){
      lenis=new Lenis({duration:1.05,smoothWheel:true});
      lenis.on('scroll',ScrollTrigger.update);
      tick=(t)=>lenis.raf(t*1000);
      gsap.ticker.add(tick);
    }
    ScrollTrigger.refresh();
    return ()=>{if(tick)gsap.ticker.remove(tick);lenis?.destroy();ctx.revert();};
  },[]);
  return <div ref={mainRef} className="site-shell"><div className="scroll-progress" style={{transform:`scaleX(${progress/100})`}} aria-hidden="true" /><Header /><main><Hero/><Ticker/><About/><Services/><Experience/><Gallery/><Trust/><Faq/><FinalCTA/></main><Footer/><a className="floating-wa" href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="Contactar al salón por WhatsApp"><MessageCircle size={24} strokeWidth={1.7}/></a><a className="mobile-book-bottom" href={booking}><CalendarDays size={18}/> Reservar mi cita <ArrowRight size={18}/></a></div>;
}
