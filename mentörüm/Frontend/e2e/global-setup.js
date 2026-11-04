import pg from 'pg';

const API_URL = 'http://localhost:5130/api/v1';
const DB_URL =
  globalThis.process?.env?.E2E_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5433/mentorum_e2e';

async function registerOrEnsure(email, password, fullName) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });
  return res.status;
}

export default async function globalSetup() {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();

  try {
    // 1. Clean up any previous E2E test users & their cascading records
    await client.query(`
      DELETE FROM coach_student_requests;
      DELETE FROM approval_items;
      DELETE FROM student_subject_targets;
      DELETE FROM student_topic_progress;
      DELETE FROM student_resources;
      DELETE FROM exam_scores;
      DELETE FROM exam_results;
      DELETE FROM homework_assignments;
      DELETE FROM program_coaches WHERE coach_id IN (SELECT id FROM users WHERE email LIKE '%@e2e.local');
      DELETE FROM students WHERE id IN (SELECT id FROM users WHERE email LIKE '%@e2e.local');
      DELETE FROM coaching_programs WHERE created_by IN (SELECT id FROM users WHERE email LIKE '%@e2e.local');
      DELETE FROM coaches WHERE id IN (SELECT id FROM users WHERE email LIKE '%@e2e.local');
      DELETE FROM users WHERE email LIKE '%@e2e.local';
    `);

    // 2. Ensure deterministic curriculum subject & topics exist for V20 & V21
    const subjId = '11111111-2222-3333-4444-555555555555';
    const topic1Id = 'aaaaaaaa-bbbb-cccc-dddd-000000000001';
    const topic2Id = 'aaaaaaaa-bbbb-cccc-dddd-000000000002';
    const topic9Id = 'aaaaaaaa-bbbb-cccc-dddd-000000000009';
    const topic10Id = 'aaaaaaaa-bbbb-cccc-dddd-000000000010';

    await client.query(
      `INSERT INTO subjects (id, name, short_code, default_color, is_system_subject)
       VALUES ($1, 'TYT Matematik E2E', 'MAT_E2E', '#4F46E5', 1)
       ON CONFLICT (id) DO NOTHING`,
      [subjId]
    );

    await client.query(
      `INSERT INTO curriculum_topics (id, subject_id, grade, curriculum_type, unit_number, unit_name, topic_number, topic_name, sort_order, is_active)
       VALUES
         ($1, $5, '12', 'NEW', 1, 'Fonksiyonlar', '1.1', 'Fonksiyon Kavramı ve Özellikleri', 1, 1),
         ($2, $5, '12', 'NEW', 1, 'Fonksiyonlar', '1.2', 'Bileşke ve Ters Fonksiyon', 2, 1),
         ($3, $5, '9', 'NEW', 1, 'Mantık ve Kümeler', '1.1', '9. Sınıf Kümeler Temel Kavramlar', 1, 1),
         ($4, $5, '10', 'NEW', 1, 'Sayma ve Olasılık', '1.1', '10. Sınıf Permütasyon ve Kombinasyon', 1, 1)
       ON CONFLICT (id) DO NOTHING`,
      [topic1Id, topic2Id, topic9Id, topic10Id, subjId]
    );

    // 3. Register Admin, Coach 1, Coach 2 via real API
    await registerOrEnsure('admin@e2e.local', 'Pass123!', 'Sistem Yöneticisi E2E');
    await registerOrEnsure('koc1@e2e.local', 'Pass123!', 'Dr. Koç Bir');
    await registerOrEnsure('koc2@e2e.local', 'Pass123!', 'Uzman Koç İki');

    // 4. Promote Admin & Approve Coach 1 and Coach 2 with deterministic phones & default workspaces
    await client.query(`
      UPDATE users
      SET is_admin = TRUE, role = 'Coach', approval_status = 'APPROVED'
      WHERE email = 'admin@e2e.local';
    `);

    await client.query(`
      UPDATE coaches
      SET approval_status = 'APPROVED'
      WHERE id IN (SELECT id FROM users WHERE email IN ('admin@e2e.local', 'koc1@e2e.local', 'koc2@e2e.local'));
    `);

    await client.query(`
      UPDATE users
      SET role = 'Coach', approval_status = 'APPROVED'
      WHERE email IN ('koc1@e2e.local', 'koc2@e2e.local');
    `);

    await client.query(`
      UPDATE coaches
      SET phone = '05551112233', specialty = 'YKS Sayısal Koçu'
      WHERE id = (SELECT id FROM users WHERE email = 'koc1@e2e.local');
    `);

    await client.query(`
      UPDATE coaches
      SET phone = '05554445566', specialty = 'YKS Eşit Ağırlık Koçu'
      WHERE id = (SELECT id FROM users WHERE email = 'koc2@e2e.local');
    `);

    // Ensure Admin, Coach 1 and Coach 2 have default coaching_programs + program_coaches rows
    for (const email of ['admin@e2e.local', 'koc1@e2e.local', 'koc2@e2e.local']) {
      const uRes = await client.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
      if (uRes.rows.length > 0) {
        const coachId = uRes.rows[0].id;
        const progCheck = await client.query(
          'SELECT program_id FROM program_coaches WHERE coach_id = $1 LIMIT 1',
          [coachId]
        );
        if (progCheck.rows.length === 0) {
          const pRes = await client.query(
            `INSERT INTO coaching_programs (id, name, created_by)
             VALUES (gen_random_uuid(), $1, $2)
             RETURNING id`,
            [`${uRes.rows[0].full_name} Koçluk Programı`, coachId]
          );
          await client.query(
            `INSERT INTO program_coaches (id, program_id, coach_id, role)
             VALUES (gen_random_uuid(), $1, $2, 'YONETICI')
             ON CONFLICT DO NOTHING`,
            [pRes.rows[0].id, coachId]
          );
        }
      }
    }
  } finally {
    await client.end();
  }
}
