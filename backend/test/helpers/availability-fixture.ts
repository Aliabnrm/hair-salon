import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
/** Call only with the fixture-owned test DB. No runtime dependency on this file. */
export async function seedAvailability(pool: Pool, today: string) {
  const business = randomUUID(),
    service = randomUUID(),
    staff = randomUUID(),
    second = randomUUID(),
    hidden = randomUUID(),
    owner = randomUUID();
  await pool.query('INSERT INTO app.users(id,email) VALUES($1,$2)', [
    owner,
    `${owner}@example.com`,
  ]);
  await pool.query(
    "INSERT INTO app.businesses(id,name,audience,city,public_address,public_phone) VALUES($1,'سالن زمان نیلوفر','women','تهران','نشانی عمومی آزمون','+989121234567')",
    [business],
  );
  await pool.query('INSERT INTO app.business_memberships(business_id,user_id) VALUES($1,$2)', [
    business,
    owner,
  ]);
  await pool.query(
    "INSERT INTO app.services(id,business_id,name,category_id,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes) VALUES($1,$2,'کوتاهی دقیق','haircut',2500000,30,10,5)",
    [service, business],
  );
  const freeService = randomUUID();
  await pool.query(
    "INSERT INTO app.services(id,business_id,name,category_id,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes) VALUES($1,$2,'مشاوره رایگان','haircut',0,17,0,0)",
    [freeService, business],
  );
  for (const [id, name, visible] of [
    [staff, 'متخصص اول', true],
    [second, 'متخصص دوم', true],
    [hidden, 'نام خصوصی آزمون', false],
  ] as const) {
    await pool.query(
      'INSERT INTO app.staff_profiles(id,business_id,display_name,public_visible) VALUES($1,$2,$3,$4)',
      [id, business, name, visible],
    );
    await pool.query(
      'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
      [business, id, service],
    );
    if (id === staff)
      await pool.query(
        'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
        [business, id, freeService],
      );
    await pool.query(
      'INSERT INTO app.staff_hours(business_id,staff_id,weekday,start_minute,end_minute) SELECT $1,$2,d,600,720 FROM generate_series(0,6) d',
      [business, id],
    );
  }
  await pool.query(
    'INSERT INTO app.business_hours(business_id,weekday,start_minute,end_minute) SELECT $1,d,600,720 FROM generate_series(0,6) d',
    [business],
  );
  const request = randomUUID();
  await pool.query(
    "INSERT INTO app.publication_events(id,business_id,actor_id,action,revision,request_id,consent) VALUES($1,$2,$3,'request',1,$1,true)",
    [request, business, owner],
  );
  await pool.query(
    "UPDATE app.businesses SET state='published',current_request_id=$2,publication_version=2 WHERE id=$1",
    [business, request],
  );
  await pool.query(
    'INSERT INTO app.schedule_exceptions(business_id,local_date,closed) VALUES($1,$2::date+1,true)',
    [business, today],
  );
  return { business, service, staff, second, hidden, freeService, owner };
}
