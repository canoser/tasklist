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

async function setRangeValue(locator, val) {
  await locator.evaluate((el, v) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, val);
}

async function loginAs(page, email, password = 'Pass123!') {
  await page.context().clearCookies();
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-password-input').fill(password);
  await page.getByTestId('login-submit-btn').click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
}

test.describe('V20 — Bağımsız Öğrenci, Yönetici Onayı, Eşleşme ve 6\'lı Özerklik Matrisi (V20-UI-01 .. V20-UI-27)', () => {
  test('Uçtan uca gerçek kullanıcılarla V20-UI-01 .. V20-UI-27 senaryoları', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // =========================================================================
    // V20-UI-01: Karanlık mod ve cam (glassmorphism) giriş ekranı kontrolü
    // =========================================================================
    await page.goto('/login');
    await expect(page.getByTestId('login-card')).toBeVisible();
    const cardRadius = await page.getByTestId('login-card').evaluate((el) => getComputedStyle(el).borderRadius);
    expect(parseFloat(cardRadius)).toBeGreaterThanOrEqual(12);

    // =========================================================================
    // V20-UI-02: Öğrenci 1 (bagimsiz@e2e.local) ve Öğrenci 2 (atanan@e2e.local) kayıt olur
    // =========================================================================
    await page.getByTestId('toggle-register-link').click();
    await page.getByTestId('login-fullname-input').fill('Bağımsız Öğrenci E2E');
    await page.getByTestId('login-email-input').fill('bagimsiz@e2e.local');
    await page.getByTestId('login-password-input').fill('Pass123!');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-success-msg')).toContainText('Yönetici onayından sonra');

    await page.getByTestId('toggle-register-link').click();
    await page.getByTestId('login-fullname-input').fill('Atanan Öğrenci E2E');
    await page.getByTestId('login-email-input').fill('atanan@e2e.local');
    await page.getByTestId('login-password-input').fill('Pass123!');
    await page.getByTestId('login-submit-btn').click();
    await expect(page.getByTestId('login-success-msg')).toContainText('Yönetici onayından sonra');

    // Fetch deterministic IDs from DB
    const { student1Id, student2Id, coach1Id, coach2Id } = await withDb(async (db) => {
      const s1 = await db.query("SELECT id FROM users WHERE email = 'bagimsiz@e2e.local'");
      const s2 = await db.query("SELECT id FROM users WHERE email = 'atanan@e2e.local'");
      const c1 = await db.query("SELECT id FROM users WHERE email = 'koc1@e2e.local'");
      const c2 = await db.query("SELECT id FROM users WHERE email = 'koc2@e2e.local'");
      return {
        student1Id: s1.rows[0].id,
        student2Id: s2.rows[0].id,
        coach1Id: c1.rows[0].id,
        coach2Id: c2.rows[0].id,
      };
    });

    // =========================================================================
    // V20-UI-03: Yönetici girişi ve Kayıt Modu (ADMIN_APPROVAL / SELF_SERVICE) kontrolü
    // =========================================================================
    await loginAs(page, 'admin@e2e.local');
    await page.goto('/coach/admin');
    await page.getByTestId('segmented-tab-security').click();
    await expect(page.getByTestId('reg-mode-admin')).toBeChecked();
    await expect(page.getByTestId('reg-mode-self')).toBeDisabled();

    // =========================================================================
    // V20-UI-04: Onay bekleyen kullanıcıda yalnızca Koç ve Öğrenci rol seçimi
    // =========================================================================
    await page.getByTestId('segmented-tab-pending').click();
    const roleGroup1 = page.getByTestId(`pending-role-select-${student1Id}`);
    await expect(roleGroup1).toBeVisible();
    await expect(roleGroup1).toContainText('Öğrenci');
    await expect(roleGroup1).toContainText('Koç');
    await expect(roleGroup1).not.toContainText('Öğretmen');
    await expect(roleGroup1).not.toContainText('Veli');

    // =========================================================================
    // V20-UI-05: Öğrenci 1'i "🌱 Bağımsız Öğrenci (Koçsuz)" olarak onaylama
    // =========================================================================
    await page.getByTestId(`pending-role-radio-${student1Id}-Student`).check();
    await page.getByTestId(`pending-coach-select-${student1Id}`).selectOption('');
    await page.getByTestId(`pending-approve-btn-${student1Id}`).click();
    await expect(page.getByTestId(`pending-approve-btn-${student1Id}`)).toHaveCount(0);

    // Set Student 1's phone and grade=12 so phone search & curriculum work deterministically
    await withDb(async (db) => {
      await db.query(
        "UPDATE students SET phone = '05559998877', grade = 12, track = 'SAY' WHERE id = $1",
        [student1Id]
      );
    });

    // =========================================================================
    // V20-UI-06: Öğrenci 2'yi onaylarken doğrudan Koç 2'ye atama
    // =========================================================================
    await page.getByTestId(`pending-role-radio-${student2Id}-Student`).check();
    await page.getByTestId(`pending-coach-select-${student2Id}`).selectOption(coach2Id);
    await page.getByTestId(`pending-approve-btn-${student2Id}`).click();
    await expect(page.getByTestId(`pending-approve-btn-${student2Id}`)).toHaveCount(0);

    // =========================================================================
    // V20-UI-07: Manuel Kullanıcı Ekleme formunda Öğrenci + Koç ataması kontrolü
    // =========================================================================
    await page.getByTestId('manual-role-select').selectOption('Student');
    await expect(page.getByTestId('manual-coach-select')).toBeVisible();

    // =========================================================================
    // V20-UI-08: Bağımsız Öğrenci 1 — (Özellik 1: Hedef Belirleme)
    // =========================================================================
    await loginAs(page, 'bagimsiz@e2e.local');
    await page.goto('/student/profile');
    await expect(page.getByTestId('independent-student-card')).toContainText('Bağımsız Öğrenci');
    await page.getByTestId('goal-university-input').fill('ODTÜ');
    await page.getByTestId('goal-department-input').fill('Bilgisayar Mühendisliği');
    await page.getByTestId('goal-score-input').fill('510');
    await page.getByTestId('goal-save-btn').click();
    await expect(page.locator('text=Hedef güncellendi.')).toBeVisible();

    // =========================================================================
    // V20-UI-09: Bağımsız Öğrenci 1 — (Özellik 2: Konu Tamamlama)
    // =========================================================================
    await page.goto('/student/courses');
    await page.getByTestId('segmented-tab-curriculum').click();
    const topicToggleBtn = page.getByTestId('student-topic-toggle-aaaaaaaa-bbbb-cccc-dddd-000000000001');
    await expect(topicToggleBtn).toBeVisible();
    await topicToggleBtn.click();
    await expect(topicToggleBtn).toContainText('Geri Al');

    // =========================================================================
    // V20-UI-10: Bağımsız Öğrenci 1 — (Özellik 3: Kaynak & Video Ders Ekleme + İlerleme)
    // =========================================================================
    await page.getByTestId('segmented-tab-myResources').click();
    await page.getByTestId('student-open-res-modal-btn').click();
    await page.getByTestId('student-res-type-select').selectOption('BOOK');
    await page.getByTestId('student-res-title-input').fill('3D TYT Matematik Soru Bankası');
    await page.getByTestId('student-res-url-input').fill('3D Yayınları');
    await page.getByTestId('student-res-units-input').fill('20');
    await page.getByTestId('student-res-add-btn').click();
    await expect(page.locator('text=3D TYT Matematik Soru Bankası')).toBeVisible();

    const incBtn = page.locator('[data-testid^="student-res-inc-btn-"]').first();
    await incBtn.click();
    await expect(page.locator('text=1/20 Bölüm')).toBeVisible();

    // =========================================================================
    // V20-UI-11: Bağımsız Öğrenci 1 — (Özellik 4: Deneme / Sınav Neti Girme & Silme)
    // =========================================================================
    await page.goto('/student/profile');
    await page.getByTestId('student-open-exam-modal-btn').click();
    await page.getByTestId('student-exam-name-input').fill('Özdebir TYT Deneme 1');
    await page.getByTestId('student-exam-net-input').fill('92.5');
    await page.getByTestId('student-exam-add-btn').click();
    await expect(page.locator('text=Özdebir TYT Deneme 1')).toBeVisible();

    // Add a second exam and delete it
    await page.getByTestId('student-open-exam-modal-btn').click();
    await page.getByTestId('student-exam-name-input').fill('Silinecek Deneme 2');
    await page.getByTestId('student-exam-net-input').fill('75');
    await page.getByTestId('student-exam-add-btn').click();
    await expect(page.locator('text=Silinecek Deneme 2')).toBeVisible();

    const secondExamRow = page.locator('div', { hasText: 'Silinecek Deneme 2' }).locator('[data-testid^="student-exam-delete-btn-"]').first();
    await secondExamRow.click();
    await expect(page.locator('text=Silinecek Deneme 2')).toHaveCount(0);

    // =========================================================================
    // V20-UI-12 & V20-UI-13: Bağımsız Öğrenci 1 — (Özellik 5: Kendi Ödevi & Özellik 6: Ödev Tamamlama)
    // =========================================================================
    await page.goto('/student/homework');
    await page.getByTestId('self-assign-hw-open-btn').click();
    await page.getByTestId('self-assign-hw-title-input').fill('Paragraf 40 Soru Çözümü');
    await page.getByTestId('self-assign-hw-submit-btn').click();
    await expect(page.locator('text=Paragraf 40 Soru Çözümü')).toBeVisible();
    await expect(page.locator('text=👤 Kendi Çalışmam')).toBeVisible();

    // Complete self-assigned homework directly (100%)
    await setRangeValue(page.locator('input[type="range"]').first(), 100);
    await page.locator('[data-testid^="hw-complete-submit-btn-"]').first().click();
    await expect(page.locator('text=✓ Tamamlandı')).toBeVisible();

    // =========================================================================
    // V20-UI-14: Eşleşme Öncesi Arama Kontrolü (Koç 2 bağımsız Öğrenci 1'i görür, koçlu Öğrenci 2'yi görmez)
    // =========================================================================
    await loginAs(page, 'koc2@e2e.local');
    await page.goto('/coach/students');
    await page.locator('button', { hasText: 'Yeni Öğrenci' }).first().click();
    await page.getByTestId('segmented-tab-SEARCH_INDEPENDENT').click();
    await page.getByTestId('coach-student-search-input').fill('05559998877');
    await expect(page.getByTestId(`search-result-row-${student1Id}`)).toBeVisible();

    // Koç 2 searches for Student 2 (already assigned to a coach) -> not in independent search results
    await page.getByTestId('coach-student-search-input').fill('atanan@e2e.local');
    await expect(page.getByTestId('coach-search-empty')).toBeVisible();

    // =========================================================================
    // V20-UI-15: Bağımsız Öğrenci 1 telefon (05551112233) ile Koç 1'i arar ve istek gönderir
    // =========================================================================
    await loginAs(page, 'bagimsiz@e2e.local');
    await page.goto('/student/profile');
    await page.getByTestId('student-coach-search-input').fill('05551112233');
    await expect(page.getByTestId(`student-coach-result-${coach1Id}`)).toBeVisible();
    await page.getByTestId(`student-send-request-btn-${coach1Id}`).click();
    await expect(page.locator('text=Koç Onayı Bekleniyor')).toBeVisible();

    // =========================================================================
    // V20-UI-16: Koç 1 gelen eşleşme isteğini görür ve Kabul Eder
    // =========================================================================
    await loginAs(page, 'koc1@e2e.local');
    await page.goto('/coach/students');
    const acceptBtn = page.locator('[data-testid^="accept-request-btn-"]').first();
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();
    await expect(acceptBtn).toHaveCount(0);

    // =========================================================================
    // V20-UI-17, V20-UI-19, V20-UI-20, V20-UI-21, V20-UI-22:
    // Koç 1 ekranında Veri Taşıma, 👤 Öğrenci rozetleri, 3 Açık / 3 Kapalı varsayılan izinler ve Bağlamsal Kısayol
    // =========================================================================
    await page.goto(`/coach/students/${student1Id}`);
    await expect(page.locator('text=ODTÜ')).toBeVisible();

    // Check V20-UI-19 initial permissions (3 Open / 3 Closed)
    await expect(page.getByTestId('perm-toggle-canCompleteTopics')).toBeChecked();
    await expect(page.getByTestId('perm-toggle-canCompleteHomework')).toBeChecked();
    await expect(page.getByTestId('perm-toggle-canEditGoals')).toBeChecked();
    await expect(page.getByTestId('perm-toggle-canAddExamResults')).not.toBeChecked();
    await expect(page.getByTestId('perm-toggle-canManageResources')).not.toBeChecked();
    await expect(page.getByTestId('perm-toggle-canSelfAssignWork')).not.toBeChecked();

    // Check Academic Tracking tab -> Topics, Homework, Exams
    await page.getByTestId('segmented-tab-academic').click();

    // Exams tab: verify migrated exam ("Özdebir TYT Deneme 1", "👤 Öğrenci Girdi") & V20-UI-20 contextual toggle
    await page.getByTestId('segmented-tab-exams').click();
    await expect(page.locator('text=Özdebir TYT Deneme 1')).toBeVisible();
    await expect(page.locator('text=👤 Öğrenci Girdi')).toBeVisible();
    await expect(page.getByTestId('quick-perm-canAddExamResults')).not.toBeChecked();
    await page.getByTestId('quick-perm-canAddExamResults').click();
    await expect(page.getByTestId('quick-perm-canAddExamResults')).toBeChecked();

    // Topics tab: verify migrated topic completion ("👤 Öğrenci") & migrated resource ("3D TYT Matematik Soru Bankası", "👤 Öğrenci Ekledi")
    await page.getByTestId('segmented-tab-topics').click();
    await expect(page.locator('text=3D TYT Matematik Soru Bankası')).toBeVisible();
    await expect(page.locator('text=👤 Öğrenci Ekledi')).toBeVisible();
    await expect(page.locator('text=👤 Öğrenci').first()).toBeVisible();

    // V20-UI-22: Homework tab -> verify migrated self-homework ("Paragraf 40 Soru Çözümü") & turn OFF canCompleteHomework
    await page.getByTestId('segmented-tab-homework').click();
    await expect(page.locator('text=Paragraf 40 Soru Çözümü')).toBeVisible();
    await expect(page.getByTestId('quick-perm-canCompleteHomework')).toBeChecked();
    await page.getByTestId('quick-perm-canCompleteHomework').click();
    await expect(page.getByTestId('quick-perm-canCompleteHomework')).not.toBeChecked();

    // Coach 1 assigns a new homework via AssignHomeworkModal
    await page.locator('main button', { hasText: 'Ödev Ata' }).first().click();
    await page.locator('input[placeholder*="Örn: Limit"]').fill('Koç Onaylı Türev Testi');
    await page.locator('input[type="datetime-local"]').fill('2026-12-01T18:00');
    await page.locator('button[type="submit"]', { hasText: 'Ödevi Ata' }).click();
    await expect(page.locator('text=Koç Onaylı Türev Testi')).toBeVisible();

    // =========================================================================
    // V20-UI-18: Eşleşme Sonrası Arama Gizliliği (Koç 2 artık Öğrenci 1'i göremez)
    // =========================================================================
    await loginAs(page, 'koc2@e2e.local');
    await page.goto('/coach/students');
    await page.locator('button', { hasText: 'Yeni Öğrenci' }).first().click();
    await page.getByTestId('segmented-tab-SEARCH_INDEPENDENT').click();
    await page.getByTestId('coach-student-search-input').fill('05559998877');
    await expect(page.getByTestId('coach-search-empty')).toBeVisible();

    // =========================================================================
    // V20-UI-23: Öğrenci 1 (Koçlu) izin kapalıyken ödevi %100 yapıp "Tamamlama Onaya Gönder" akışı
    // =========================================================================
    await loginAs(page, 'bagimsiz@e2e.local');
    await page.goto('/student/homework');
    // Self-assign button is hidden because canSelfAssignWork is false
    await expect(page.getByTestId('self-assign-hw-open-btn')).toHaveCount(0);

    await setRangeValue(page.locator('input[type="range"]').first(), 100);
    const submitHwBtn = page.locator('[data-testid^="hw-complete-submit-btn-"]').first();
    await expect(submitHwBtn).toContainText('Tamamlama Onaya Gönder');
    await submitHwBtn.click();
    await expect(page.locator('text=Onay Bekleniyor').first()).toBeVisible();

    // =========================================================================
    // V20-UI-24: Koç 1 Onay Merkezi (ApprovalsPage) üzerinden HOMEWORK_DONE talebini onaylar
    // =========================================================================
    await loginAs(page, 'koc1@e2e.local');
    await page.goto('/coach/approvals');
    await expect(page.locator('text=Koç Onaylı Türev Testi')).toBeVisible();
    await page.locator('[data-testid^="approval-approve-btn-"]').first().click();
    await expect(page.locator('[data-testid^="approval-approve-btn-"]')).toHaveCount(0);

    // =========================================================================
    // V20-UI-25 & V20-UI-27: Karanlık mod input/select kontrolü + Koçluktan Ayırma (Unlink)
    // =========================================================================
    await page.goto(`/coach/students/${student1Id}`);
    // V20-UI-27: Check EditStudentModal in dark mode
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.locator('button', { hasText: 'Düzenle' }).first().click();
    const modalInputBg = await page
      .locator('input[placeholder="Örn: Ahmet"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(modalInputBg).not.toBe('rgb(255, 255, 255)');
    await page.locator('button', { hasText: 'İptal' }).first().click();

    // V20-UI-25: Unlink student
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('unlink-student-btn').click();
    await page.waitForURL('**/coach/students', { timeout: 15000 });

    // =========================================================================
    // V20-UI-26: Simetrik Veri Taşıma Doğrulaması (Öğrenci 1 tekrar Bağımsız Modda ve tüm verileri duruyor)
    // =========================================================================
    await loginAs(page, 'bagimsiz@e2e.local');
    await page.goto('/student/profile');
    await expect(page.getByTestId('independent-student-card')).toContainText('Bağımsız Öğrenci');
    await expect(page.locator('text=Özdebir TYT Deneme 1')).toBeVisible();

    await page.goto('/student/homework');
    await expect(page.getByTestId('self-assign-hw-open-btn')).toBeVisible();
    await expect(page.locator('text=Koç Onaylı Türev Testi')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});

