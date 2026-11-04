import { test, expect } from '@playwright/test';
import pg from 'pg';

const DB_URL =
  globalThis.process?.env?.E2E_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5433/mentorum_e2e';

async function withDb(fn) {
  const client = new pg.Client({ connectionString: DB_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function loginAs(page, email, password = 'Pass123!') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
}

test.describe('V21 — 6-12. Sınıf Bazlı Eğitim Koçluğu Raporlama Sistemleri ve Sınıf Geçmişi Arşivi', () => {
  test('Öğrenci ve Koç ekranlarında 9. Sınıf Karnesi, Hedef Net Girişi, 9->10 Sınıf Atlatma ve 9. Sınıf Arşiv/Müfredat Erişimi', async ({
    page,
  }) => {
    const subjId = '11111111-2222-3333-4444-555555555555';

    // 1. V21 test öğrencisini oluştur ve Dr. Koç Bir (koc1@e2e.local) programına 9. Sınıf olarak bağla
    await page.goto('/login');
    await page.getByTestId('toggle-register-link').click();
    await page.getByTestId('login-fullname-input').fill('V21 Sınıf Öğrencisi');
    await page.getByTestId('login-email-input').fill('v21ogrenci@e2e.local');
    await page.getByTestId('login-password-input').fill('Pass123!');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-success-msg')).toContainText('Yönetici onayından sonra');

    const studentId = await withDb(async (db) => {
      const uRes = await db.query("SELECT id FROM users WHERE email = 'v21ogrenci@e2e.local'");
      const sid = uRes.rows[0].id;
      const cRes = await db.query("SELECT id FROM users WHERE email = 'koc1@e2e.local'");
      const coachId = cRes.rows[0].id;
      const pRes = await db.query('SELECT program_id FROM program_coaches WHERE coach_id = $1 LIMIT 1', [coachId]);
      const progId = pRes.rows[0].program_id;

      await db.query("UPDATE users SET role = 'Student', approval_status = 'APPROVED' WHERE id = $1", [sid]);
      await db.query("DELETE FROM coaches WHERE id = $1", [sid]);
      await db.query(
        `INSERT INTO students (
           id, program_id, grade, track, target_university, target_department, target_score,
           can_complete_topics, can_edit_goals, can_complete_homework, can_add_exam_results, can_manage_resources, can_self_assign_work
         ) VALUES ($1, $2, 9, 'SAY', 'İTÜ', 'Bilgisayar Mühendisliği', 510, 1, 1, 1, 1, 1, 1)
         ON CONFLICT (id) DO UPDATE SET program_id = $2, grade = 9, can_edit_goals = 1`,
        [sid, progId]
      );

      // 9. Sınıf deneme sınavı ve check-in kaydı ekle
      const exam9Id = '99999999-1111-2222-3333-444444444409';
      await db.query(
        `INSERT INTO exam_results (id, program_id, student_id, exam_type, exam_name, exam_date, total_net, error_reasons, grade)
         VALUES ($1, $2, $3, 'TYT', '9. Sınıf Kümeler Denemesi', CURRENT_DATE - 7, 65.5, 'Dikkat Hatası, Süre Yetişmedi', 9)
         ON CONFLICT (id) DO NOTHING`,
        [exam9Id, progId, sid]
      );
      await db.query(
        `INSERT INTO exam_scores (id, exam_id, subject_id, subject_name, question_count, correct, wrong, blank, net)
         VALUES (gen_random_uuid(), $1, $2, 'TYT Matematik E2E', 40, 26, 4, 10, 25.0)`,
        [exam9Id, subjId]
      );
      await db.query(
        `INSERT INTO student_checkins (id, program_id, student_id, checkin_date, mood, note)
         VALUES (gen_random_uuid(), $1, $2, CURRENT_DATE, 'GREAT', '9. sınıf çalışması çok iyi')
         ON CONFLICT DO NOTHING`,
        [progId, sid]
      );

      return sid;
    });

    // 2. Öğrenci giriş yapar -> /student/reports sayfasında 9. Sınıf sistemini ve SVG grafiği görür, hedef net girer
    await loginAs(page, 'v21ogrenci@e2e.local');
    await page.goto('/student/reports');
    await expect(page.getByTestId('grade-report-dashboard')).toBeVisible();
    await expect(page.getByTestId('grade-system-title')).toContainText('9. Sınıf — Lise Adaptasyon, OBP Kalkanı & Temel TYT Sistemi');
    await expect(page.getByTestId('exam-trend-svg-chart')).toBeVisible();

    await page.getByTestId('open-subject-targets-btn').click();
    await page.getByTestId('target-net-input-TYT Matematik E2E').fill('35');
    await page.getByTestId('save-subject-targets-btn').click();
    await expect(page.getByTestId('subject-mastery-table')).toContainText('35 Net');

    // 3. Öğrenci 10. sınıfa atlatılır ve 10. sınıfta yeni bir sınav eklenir
    await withDb(async (db) => {
      const pRes = await db.query('SELECT program_id FROM students WHERE id = $1', [studentId]);
      const progId = pRes.rows[0].program_id;
      await db.query('UPDATE students SET grade = 10 WHERE id = $1', [studentId]);

      const exam10Id = '99999999-1111-2222-3333-444444444410';
      await db.query(
        `INSERT INTO exam_results (id, program_id, student_id, exam_type, exam_name, exam_date, total_net, grade)
         VALUES ($1, $2, $3, 'TYT', '10. Sınıf Alan Denemesi', CURRENT_DATE, 79.25, 10)
         ON CONFLICT (id) DO NOTHING`,
        [exam10Id, progId, studentId]
      );
      await db.query(
        `INSERT INTO exam_scores (id, exam_id, subject_id, subject_name, question_count, correct, wrong, blank, net)
         VALUES (gen_random_uuid(), $1, $2, 'TYT Matematik E2E', 40, 32, 4, 4, 31.0)`,
        [exam10Id, subjId]
      );
    });

    // 4. Öğrenci /student/courses -> Müfredat sekmesinde 9. Sınıf Müfredatına erişebildiğini doğrular
    await page.goto('/student/courses');
    await page.getByTestId('segmented-tab-curriculum').click();
    await page.getByTestId('student-curriculum-grade-select').selectOption('9');
    await expect(page.locator('body')).toContainText('9. Sınıf Kümeler Temel Kavramlar');

    // 5. Koç (koc1@e2e.local) giriş yapar -> /coach/reports üzerinden 10. Sınıf Kohortunu ve 9. Sınıf Geçmiş Dönem Arşivini doğrular
    await loginAs(page, 'koc1@e2e.local');
    await page.goto('/coach/reports');
    await expect(page.getByTestId('cohort-card-grade-10')).toBeVisible();
    await page.getByTestId(`cohort-open-student-${studentId}`).click();

    await expect(page.getByTestId('grade-system-title')).toContainText('10. Sınıf — Alan Seçimi Karar Matrisi & TYT İnşa Sistemi');
    await expect(page.getByTestId('grade10-track-matrix')).toBeVisible();

    // Geçmiş dönem 9. Sınıf sekmesine tıkla -> 9. sınıf sistemi, sınavı ve 35 Net hedefi korunmuş olmalı!
    await page.getByTestId('segmented-tab-9').click();
    await expect(page.getByTestId('grade-system-title')).toContainText('9. Sınıf — Lise Adaptasyon, OBP Kalkanı & Temel TYT Sistemi');
    await expect(page.getByTestId('exam-trend-svg-chart')).toContainText('9. Sınıf');
    await expect(page.getByTestId('subject-mastery-table')).toContainText('35 Net');
  });
});

