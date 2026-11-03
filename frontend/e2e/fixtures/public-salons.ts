import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
// Controlled data in the fixture-owned temporary DB only; the publication flow is tested separately through real UI.
export async function seedPublicSalons(pool: Pool) {
  await pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  const owner = randomUUID(),
    reviewer = randomUUID();
  await pool.query('INSERT INTO app.users(id,email) VALUES($1,$2),($3,$4)', [
    owner,
    'discovery-owner@example.com',
    reviewer,
    'discovery-reviewer@example.com',
  ]);
  const salons = [
    {
      id: randomUUID(),
      name: 'آزمون کشف نیلوفر',
      audience: 'women',
      category: 'color',
      city: 'کاشان',
      district: 'یاس',
      price: 3500000,
    },
    {
      id: randomUUID(),
      name: 'آزمون کشف ماهور',
      audience: 'men',
      category: 'haircut',
      city: 'شیراز',
      district: 'معالی‌آباد',
      price: 2000000,
    },
  ];
  for (const b of salons) {
    await pool.query(
      'INSERT INTO app.businesses(id,name,audience,city,district,public_address,public_phone) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [b.id, b.name, b.audience, b.city, b.district, 'نشانی آزمون کنترل‌شده', '+989121234567'],
    );
    await pool.query('INSERT INTO app.business_memberships(business_id,user_id) VALUES($1,$2)', [
      b.id,
      owner,
    ]);
    const s = (
      await pool.query(
        'INSERT INTO app.services(business_id,name,category_id,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes) VALUES($1,$2,$3,$4,30,0,0) RETURNING id',
        [b.id, b.category === 'color' ? 'رنگ مو' : 'کوتاهی مو', b.category, b.price],
      )
    ).rows[0].id;
    const st = (
      await pool.query(
        "INSERT INTO app.staff_profiles(business_id,display_name,public_visible) VALUES($1,'متخصص آزمون کشف',true) RETURNING id",
        [b.id],
      )
    ).rows[0].id;
    await pool.query(
      'INSERT INTO app.staff_services(business_id,staff_id,service_id) VALUES($1,$2,$3)',
      [b.id, st, s],
    );
    await pool.query(
      'INSERT INTO app.business_hours(business_id,weekday,start_minute,end_minute) VALUES($1,0,540,1080)',
      [b.id],
    );
    await pool.query(
      'INSERT INTO app.staff_hours(business_id,staff_id,weekday,start_minute,end_minute) VALUES($1,$2,0,540,1080)',
      [b.id, st],
    );
    const request = randomUUID();
    await pool.query(
      "INSERT INTO app.publication_events(id,business_id,actor_id,action,revision,request_id,consent) VALUES($1,$2,$3,'request',1,$1,true)",
      [request, b.id, owner],
    );
    await pool.query(
      "INSERT INTO app.publication_events(business_id,actor_id,action,revision,request_id,publication_version) VALUES($1,$2,'approve',1,$3,2)",
      [b.id, reviewer, request],
    );
    await pool.query(
      "UPDATE app.businesses SET state='published',current_request_id=$2,publication_version=2 WHERE id=$1",
      [b.id, request],
    );
  }
  return salons;
}
