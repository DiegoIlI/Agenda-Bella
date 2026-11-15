/* Service worker de Agenda Bella. Notificaciones web push reales; no temporizadores de demo. */
const CACHE='agenda-bella-shell-v1';
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll([self.registration.scope]).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(self.registration.scope))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(self.registration.scope)));}});
self.addEventListener('push',e=>{
 let data={};try{data=e.data?.json()||{};}catch{data={body:e.data?.text()||'Tienes una cita próximamente.'};}
 e.waitUntil(self.registration.showNotification(data.title||'Agenda Bella · Recordatorio',{
  body:data.body||'Mañana tienes una cita. ¡Te esperamos!',icon:new URL('icon-192.png',self.registration.scope).href,badge:new URL('icon-192.png',self.registration.scope).href,tag:data.tag||'agenda-bella-cita',data:{url:data.url||self.registration.scope},vibrate:[100,60,100]
 }));
});
self.addEventListener('notificationclick',e=>{e.notification.close();const url=e.notification.data?.url||self.registration.scope;e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const c of clients){if(c.url===url&&'focus'in c)return c.focus();}return self.clients.openWindow(url);}));});
