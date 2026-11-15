#!/usr/bin/env bash
# Pruebas SQL de Agenda Bella contra PostgreSQL REAL (no es Supabase; ver docs/QA_RESULTADOS.md).
# Uso: PGHOST=... PGPORT=... PGUSER=... ./run_all.sh     (requiere permisos para crear roles/bases)
set -euo pipefail
export PGOPTIONS='-c client_min_messages=error'
cd "$(dirname "$0")"
MIG=../../supabase/migrations
P="psql -X -q -v ON_ERROR_STOP=1"
fresh(){ dropdb --if-exists "$1" >/dev/null 2>&1; createdb "$1"; $P -d "$1" -f stubs.sql >/dev/null 2>&1; }
all3(){ for f in 001_agenda_bella 002_telefono_salon 003_agenda_bella_v3; do $P -d "$1" -f $MIG/$f.sql >/dev/null; done; }
echo "== A) Instalación nueva: 001 + 002 + 003 =="; fresh ab_fresh; all3 ab_fresh; echo "   OK"
echo "== B) Idempotencia: 003 ×2 más; y 001 ×2 + 002 + 003 ×2 en otra base =="
$P -d ab_fresh -f $MIG/003_agenda_bella_v3.sql >/dev/null; $P -d ab_fresh -f $MIG/003_agenda_bella_v3.sql >/dev/null
fresh ab_idem; $P -d ab_idem -f $MIG/001_agenda_bella.sql >/dev/null; $P -d ab_idem -f $MIG/001_agenda_bella.sql >/dev/null
$P -d ab_idem -f $MIG/002_telefono_salon.sql >/dev/null; $P -d ab_idem -f $MIG/003_agenda_bella_v3.sql >/dev/null; $P -d ab_idem -f $MIG/003_agenda_bella_v3.sql >/dev/null; echo "   OK"
echo "== B2) setup_completo.sql en base nueva (una vez; es para base nueva) =="
fresh ab_setup; $P -d ab_setup -f ../../supabase/setup_completo.sql >/dev/null
psql -X -d ab_setup -Atc "select count(*) from pg_proc where proname in ('day_slots','book_appointment','reminders_due','admin_create_booking')" | grep -qx 4 && echo "   OK"
echo "== C) Comportamiento: RLS, reservas, solapes, descansos, bloqueos, cancelación, recordatorios =="
fresh ab_behavior; all3 ab_behavior; $P -d ab_behavior -f helpers.sql >/dev/null
psql -X -q -d ab_behavior -f behavior.sql >/dev/null 2>/tmp/ab_behavior.err || { cat /tmp/ab_behavior.err; exit 1; }
psql -X -At -F ' | ' -d ab_behavior -c "select case when ok then 'PASS' else 'FAIL' end, n, name from t.log order by n"
echo "TOTAL: $(psql -X -Atc "select count(*) filter (where ok)||' aprobadas, '||count(*) filter (where not ok)||' fallidas' from t.log" -d ab_behavior)"
FAILS=$(psql -X -Atc "select count(*) from t.log where not ok" -d ab_behavior)
echo "== D) Migrar desde la v2 original con citas existentes =="
fresh ab_upgrade; $P -d ab_upgrade -f fixtures/001_original_v2.sql >/dev/null; $P -d ab_upgrade -f $MIG/002_telefono_salon.sql >/dev/null; $P -d ab_upgrade -f upgrade_seed.sql >/dev/null
BEFORE=$(psql -X -d ab_upgrade -Atc "select count(*) from bookings"); $P -d ab_upgrade -f $MIG/003_agenda_bella_v3.sql >/dev/null
AFTER=$(psql -X -d ab_upgrade -Atc "select count(*) from bookings")
echo "   citas antes=$BEFORE después=$AFTER"; [ "$BEFORE" = "$AFTER" ] && [ "$BEFORE" -ge 3 ]
psql -X -d ab_upgrade -Atc "select '   precio personalizado conservado (Pedicura): '||price from services where name='Pedicura'; select '   cita previa conservada: '||client_name||' '||phone||' '||status||' consentimiento='||whatsapp_opt_in from bookings order by client_name limit 1; select '   servicios con icono nuevo: '||count(*) from services where icon is not null;"
$P -d ab_upgrade -c "select * from public.available_slots((select id from services where name='Corte de cabello'), current_date+5)" >/dev/null && echo "   available_slots funciona tras migrar"
echo "== E) Concurrencia real =="; PGOPTIONS='-c client_min_messages=error' ./concurrency.sh | tail -12
[ "$FAILS" = "0" ] && echo "SQL: TODO APROBADO" || { echo "SQL: HAY FALLAS"; exit 1; }
