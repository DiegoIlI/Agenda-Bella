#!/usr/bin/env bash
# Carrera real entre sesiones simultáneas: dos "teléfonos" reservan el mismo horario.
set -uo pipefail
export PGOPTIONS='-c client_min_messages=warning'
DB=ab_concurrency
dropdb --if-exists $DB >/dev/null 2>&1; createdb $DB
M=../../supabase/migrations
for f in stubs.sql $M/001_agenda_bella.sql $M/002_telefono_salon.sql $M/003_agenda_bella_v3.sql; do psql -X -q -v ON_ERROR_STOP=1 -d $DB -f $f >/dev/null 2>&1 || { echo "falló $f"; exit 1; }; done
Q(){ psql -X -Atq -d $DB -c "$1"; }
BAL=$(Q "select id from services where name='Mechas / Balayage'")
CUT=$(Q "select id from services where name='Corte de cabello'")
D=$(Q "select (current_date+n)::text from generate_series(4,20) n where extract(dow from current_date+n)=3 limit 1")
echo "Día de prueba (miércoles): $D"
echo "--- 1) Teléfono A inserta (transacción abierta 2 s); teléfono B intenta un horario que se traslapa ---"
( psql -X -Atq -d $DB -c "begin; select 'A:'||token from book_appointment('$BAL','$D','10:00','Ana López','9991111111',true,true); select pg_sleep(2); commit;" > /tmp/ab_conc_a.txt 2>&1 ) &
sleep 0.6
RB=$(psql -X -Atq -d $DB -c "select 'B:'||token from book_appointment('$CUT','$D','11:00','Beatriz Ruiz','9992222222',false,true)" 2>&1)
wait
echo "A => $(cat /tmp/ab_conc_a.txt | tr '\n' ' ' | cut -c1-80)"
echo "B => $RB"
N=$(Q "select count(*) from bookings where status='confirmed'")
echo "citas confirmadas = $N (esperado 1)"
PASS1=0; [ "$N" = "1" ] && echo "$RB" | grep -q "Otra clienta acaba de reservar" && PASS1=1
echo "--- 2) 12 teléfonos al mismo tiempo, mismo horario (14:00 corte) ---"
rm -f /tmp/ab_conc_*.res
for i in $(seq 1 12); do
  ( psql -X -Atq -d $DB -c "select 'OK' from book_appointment('$CUT','$D','14:00','Clienta $i','99933300$(printf %02d $i)',false,true)" > /tmp/ab_conc_$i.res 2>&1 ) &
done
wait
OKS=$(cat /tmp/ab_conc_*.res | grep -c '^OK')
FAILS=$(cat /tmp/ab_conc_*.res | grep -cE 'ya no está disponible|Otra clienta')
echo "éxitos=$OKS (esperado 1) rechazos amables=$FAILS (esperado 11)"
N2=$(Q "select count(*) from bookings where start_at=('$D 14:00'::timestamp at time zone 'America/Merida') and status='confirmed'")
echo "citas confirmadas a las 14:00 = $N2 (esperado 1)"
PASS2=0; [ "$OKS" = "1" ] && [ "$FAILS" = "11" ] && [ "$N2" = "1" ] && PASS2=1
echo "--- 3) Restricción en la base: insertar solape directo como superusuario debe fallar ---"
E=$(psql -X -Atq -d $DB -c "insert into bookings(service_id,client_name,phone,start_at,end_at) select '$CUT','Zz Zz','9990000000',start_at,end_at from bookings where status='confirmed' limit 1" 2>&1)
echo "$E" | head -1
PASS3=0; echo "$E" | grep -q "bookings_no_overlap" && PASS3=1
[ $PASS1 = 1 ] && [ $PASS2 = 1 ] && [ $PASS3 = 1 ] && echo "CONCURRENCIA: PASS (3/3)" || { echo "CONCURRENCIA: FAIL ($PASS1 $PASS2 $PASS3)"; exit 1; }
