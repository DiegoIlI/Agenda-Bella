-- Ejecutar una sola vez si 001 ya se aplicó con el número anterior o vacío.
-- Número comercial proporcionado para este proyecto: 999 766 6778 (Mérida, México).
-- Guardar 10 dígitos; la aplicación añade 52 al construir enlaces wa.me.
update public.salon_settings
set whatsapp_phone = '9997666778'
where id = 1;
