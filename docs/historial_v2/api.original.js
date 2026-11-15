import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const live = !!(url && key && !url.includes('TU_PROYECTO') && !key.includes('TU_PUBLISHABLE'));
export const db = live ? createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true}}) : null;
export const DEFAULTS = {
 salon_name:'Agenda Bella', tagline:'Tu belleza, nuestro arte', whatsapp_phone:'9997666778', instagram:'', booking_window_days:60,
};
export const SAMPLE_SERVICES = [
 {id:'demo-cut',name:'Corte de cabello',category:'Cabello',duration_minutes:45,price:180,emoji:'✂️',description:'Un cambio que se siente increíble.',active:true},
 {id:'demo-color',name:'Tinte completo',category:'Cabello',duration_minutes:120,price:650,emoji:'🎨',description:'Color, brillo y personalidad.',active:true},
 {id:'demo-highlights',name:'Mechas / Balayage',category:'Cabello',duration_minutes:180,price:1200,emoji:'✨',description:'Luz y dimensión para tu cabello.',active:true},
 {id:'demo-hair',name:'Peinado profesional',category:'Cabello',duration_minutes:60,price:280,emoji:'🌷',description:'Luce espectacular en tu ocasión.',active:true},
 {id:'demo-mani',name:'Manicura',category:'Uñas',duration_minutes:45,price:180,emoji:'💅',description:'Manos lindas, cuidado completo.',active:true},
 {id:'demo-acrylic',name:'Uñas acrílicas',category:'Uñas',duration_minutes:120,price:450,emoji:'💎',description:'Diseños que hablan de ti.',active:true},
 {id:'demo-pedi',name:'Pedicura',category:'Bienestar',duration_minutes:60,price:250,emoji:'🫧',description:'Un momento de cuidado para ti.',active:true},
 {id:'demo-treatment',name:'Tratamiento capilar',category:'Cabello',duration_minutes:90,price:400,emoji:'🌿',description:'Nutrición y suavidad profunda.',active:true},
];
export const HOURS = [
 {weekday:0,start_time:'09:00',end_time:'17:00',is_open:false},
 {weekday:1,start_time:'09:00',end_time:'19:00',is_open:true},
 {weekday:2,start_time:'09:00',end_time:'19:00',is_open:true},
 {weekday:3,start_time:'09:00',end_time:'19:00',is_open:true},
 {weekday:4,start_time:'09:00',end_time:'19:00',is_open:true},
 {weekday:5,start_time:'09:00',end_time:'19:00',is_open:true},
 {weekday:6,start_time:'09:00',end_time:'16:00',is_open:true},
];
const KEY='agenda-bella-demo-v1';
export function demoState(){
 try {const s=JSON.parse(localStorage.getItem(KEY));if(s?.services?.length)return s;}catch{}
 const today=localToday();const add=(n)=>addDays(today,n);
 const s={services:SAMPLE_SERVICES,settings:DEFAULTS,hours:HOURS,bookings:[
  {id:'seed-1',booking_token:'seed-1',service_id:'demo-mani',client_name:'Ana Rodríguez',phone:'9990000001',day:add(1),time:'10:00',status:'confirmed',whatsapp_opt_in:true},
  {id:'seed-2',booking_token:'seed-2',service_id:'demo-highlights',client_name:'María López',phone:'9990000002',day:add(2),time:'11:00',status:'confirmed',whatsapp_opt_in:true},
  {id:'seed-3',booking_token:'seed-3',service_id:'demo-cut',client_name:'Sofía Pérez',phone:'9990000003',day:add(1),time:'12:00',status:'confirmed',whatsapp_opt_in:true},
 ],time_off:[]};localStorage.setItem(KEY,JSON.stringify(s));return s;
}
function save(s){localStorage.setItem(KEY,JSON.stringify(s));window.dispatchEvent(new CustomEvent('demo-changed'));}
export function localToday(){const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Merida',year:'numeric',month:'2-digit',day:'2-digit'});const ps=f.formatToParts(new Date());return `${ps.find(x=>x.type==='year').value}-${ps.find(x=>x.type==='month').value}-${ps.find(x=>x.type==='day').value}`;}
export function addDays(ymd,n){const dt=new Date(`${ymd}T12:00:00Z`);dt.setUTCDate(dt.getUTCDate()+n);return dt.toISOString().slice(0,10);}
export function dayOfWeek(ymd){return new Date(`${ymd}T12:00:00Z`).getUTCDay();}
export function minutes(t){return +t.slice(0,2)*60 + +t.slice(3,5);}
export function clock(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function displayDate(day,opts={}){return new Date(`${day}T12:00:00Z`).toLocaleDateString('es-MX',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',...opts});}
export function formatTime(t){const [h,m]=t.slice(0,5).split(':').map(Number);return new Intl.DateTimeFormat('es-MX',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'UTC'}).format(new Date(Date.UTC(2020,0,1,h,m))).toLowerCase();}
export function validatePhone(s){return s.replace(/\D/g,'').length===10;}
export function demoSlots(service,day){
 const s=demoState();const h=s.hours.find(x=>x.weekday===dayOfWeek(day));if(!h?.is_open||day<localToday()||day>addDays(localToday(),60))return [];
 const result=[];let from=minutes(h.start_time),end=minutes(h.end_time),dur=service.duration_minutes;
 for(let m=from;m+dur<=end;m+=30){
  const now=new Date();const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Merida',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);if(day===localToday() && m <=minutes(parts)+30)continue;
  const blocked=s.time_off.some(b=> b.day===day && (b.all_day || (m<minutes(b.end_time) && m+dur>minutes(b.start_time))));
  const overlaps=s.bookings.some(b=>b.day===day&&b.status==='confirmed'&&m<minutes(b.time)+(s.services.find(x=>x.id===b.service_id)?.duration_minutes||60)&&m+dur>minutes(b.time));
  if(!blocked&&!overlaps)result.push(clock(m));
 }
 return result;
}
export const api={
 async getPublic(){if(!live){const s=demoState();return {settings:s.settings,services:s.services.filter(x=>x.active),hours:s.hours};}
  const [cfg,services,hours]=await Promise.all([db.from('salon_settings').select('*').single(),db.from('services').select('*').eq('active',true).order('sort_order'),db.from('working_hours').select('*').order('weekday')]);
  for(const r of [cfg,services,hours])if(r.error)throw r.error;return {settings:cfg.data,services:services.data,hours:hours.data};
 },
 async getSlots(id,day){if(!live){const s=demoState();return demoSlots(s.services.find(x=>x.id===id),day);}const {data,error}=await db.rpc('available_slots',{p_service_id:id,p_day:day});if(error)throw error;return data.map(x=>x.time_label);},
 async month(id,month){if(!live){const days=[];for(let n=1;n<=new Date(+month.slice(0,4),+month.slice(5,7),0).getDate();n++){const d=`${month.slice(0,7)}-${String(n).padStart(2,'0')}`;days.push({day:d,free_slots:demoSlots(demoState().services.find(x=>x.id===id),d).length});}return days;}
  const {data,error}=await db.rpc('monthly_availability',{p_service_id:id,p_month:`${month.slice(0,7)}-01`});if(error)throw error;return data;
 },
 async book(fields){
  if(!live){const s=demoState();const service=s.services.find(x=>x.id===fields.service_id);if(!demoSlots(service,fields.day).includes(fields.time))throw Error('Este horario ya no está disponible.');const token=crypto.randomUUID();s.bookings.push({id:token,booking_token:token,...fields,status:'confirmed'});save(s);return token;}
  const {data,error}=await db.rpc('book_appointment',{p_service_id:fields.service_id,p_day:fields.day,p_time:fields.time,p_name:fields.client_name,p_phone:fields.phone,p_whatsapp_opt_in:fields.whatsapp_opt_in});if(error)throw error;return data[0]?.token;
 },
 async booking(token){if(!live){const s=demoState();const b=s.bookings.find(x=>x.booking_token===token);return b?{...b,service_name:s.services.find(x=>x.id===b.service_id)?.name}:null;}
  const {data,error}=await db.rpc('appointment_detail',{p_token:token});if(error)throw error;return data[0]||null;},
 async cancel(token){if(!live){const s=demoState(),b=s.bookings.find(x=>x.booking_token===token);if(!b)throw Error('Cita no encontrada');b.status='cancelled';save(s);return;}
  const {data,error}=await db.rpc('cancel_appointment',{p_token:token});if(error)throw error;if(!data)throw Error('No se pudo cancelar la cita');},
 async revokeWhatsApp(token){if(!live){const s=demoState();const b=s.bookings.find(x=>x.booking_token===token);if(!b)throw Error('Cita no encontrada');b.whatsapp_opt_in=false;save(s);return;}
  const {data,error}=await db.rpc('revoke_whatsapp',{p_token:token});if(error)throw error;if(!data)throw Error('No fue posible cambiar el permiso de WhatsApp');
 },
 async subscribe(token,subscription){if(!live)return;const v=subscription.toJSON();const {error}=await db.rpc('register_push',{p_token:token,p_endpoint:v.endpoint,p_p256dh:v.keys.p256dh,p_auth:v.keys.auth});if(error)throw error;},
 async isStaff(){if(!live)return true;const {data:{user}}=await db.auth.getUser();if(!user)return false;const {data,error}=await db.from('staff_users').select('user_id').eq('user_id',user.id).maybeSingle();if(error)throw error;return !!data;},
 async adminBookings(){if(!live){const s=demoState();return s.bookings.map(b=>({...b,services:{name:s.services.find(x=>x.id===b.service_id)?.name,duration_minutes:s.services.find(x=>x.id===b.service_id)?.duration_minutes},start_at:`${b.day}T${b.time}:00-06:00`})).sort((a,b)=>a.start_at.localeCompare(b.start_at));}
  const {data,error}=await db.from('bookings').select('id,booking_token,client_name,phone,start_at,end_at,status,whatsapp_opt_in,services(name,duration_minutes)').order('start_at',{ascending:true});if(error)throw error;return data;
 },
 async adminServices(){if(!live)return demoState().services;const {data,error}=await db.from('services').select('*').order('sort_order');if(error)throw error;return data;},
 async adminUpdateService(x){if(!live){const s=demoState();s.services=s.services.map(v=>v.id===x.id?{...v,...x}:v);save(s);return;}
  const {error}=await db.from('services').update({name:x.name,category:x.category,price:+x.price,duration_minutes:+x.duration_minutes,active:!!x.active}).eq('id',x.id);if(error)throw error;
 },
 async adminCreateService(x){
  if(!live){const s=demoState();s.services.push({id:crypto.randomUUID(),name:x.name,category:x.category,description:'',emoji:x.emoji||'✦',price:+x.price,duration_minutes:+x.duration_minutes,active:true,sort_order:s.services.length+1});save(s);return;}
  const {error}=await db.from('services').insert({name:x.name,category:x.category,emoji:x.emoji||'✦',price:+x.price,duration_minutes:+x.duration_minutes,active:true,sort_order:99});if(error)throw error;
 },
 async adminWorkingHours(){if(!live)return demoState().hours;const {data,error}=await db.from('working_hours').select('*').order('weekday');if(error)throw error;return data;},
 async adminUpdateHours(hours){if(!live){const s=demoState();s.hours=hours;save(s);return;}
  for(const h of hours){const {error}=await db.from('working_hours').update({is_open:h.is_open,start_time:h.start_time,end_time:h.end_time}).eq('weekday',h.weekday);if(error)throw error;}
 },
 async adminTimeOff(){if(!live)return demoState().time_off.map((x,i)=>({id:x.id||String(i),day:x.day,all_day:true}));
  const {data,error}=await db.from('time_off').select('id,start_at,end_at,reason');if(error)throw error;return data;
 },
 async adminUnblock(id){if(!live){const s=demoState();s.time_off=s.time_off.filter((x,i)=>(x.id||String(i))!==id);save(s);return;}
  const {error}=await db.from('time_off').delete().eq('id',id);if(error)throw error;
 },
 async adminSettings(x){if(!live){const s=demoState();s.settings={...s.settings,...x};save(s);return;}
  const {error}=await db.from('salon_settings').update({salon_name:x.salon_name,tagline:x.tagline,whatsapp_phone:x.whatsapp_phone}).eq('id',1);if(error)throw error;
 },
 async adminBlock(day){if(!live){const s=demoState();s.time_off.push({day,all_day:true});save(s);return;}
  const {error}=await db.from('time_off').insert({start_at:`${day}T00:00:00-06:00`,end_at:`${addDays(day,1)}T00:00:00-06:00`,reason:'Día bloqueado'});if(error)throw error;
 },
 async adminCancel(id){if(!live){const s=demoState();const b=s.bookings.find(x=>x.id===id);if(b)b.status='cancelled';save(s);return;}
  const {error}=await db.from('bookings').update({status:'cancelled'}).eq('id',id);if(error)throw error;
 },
};
export function makeWhatsApp(phone,text='¡Hola! Quisiera información sobre mi cita.'){const p=phone?.replace(/\D/g,'');if(!p)return null;return `https://wa.me/${p.length===10?'52'+p:p}?text=${encodeURIComponent(text)}`;}
export function toLocalDayTime(date){const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Merida',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(date));const g=x=>parts.find(p=>p.type===x)?.value;return {day:`${g('year')}-${g('month')}-${g('day')}`,time:`${g('hour')}:${g('minute')}`};}
