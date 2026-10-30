export const WEEKDAYS_ZERO_INDEXED = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

export const WEEKDAYS_ONE_INDEXED = [
  '',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

export const SHORT_WEEKDAYS_ONE_INDEXED = [
  '',
  'Pzt',
  'Sal',
  'Çar',
  'Per',
  'Cum',
  'Cmt',
  'Paz',
];

export const WEEKDAY_PILLS = [
  { id: 1, label: 'Pzt' },
  { id: 2, label: 'Sal' },
  { id: 3, label: 'Çar' },
  { id: 4, label: 'Per' },
  { id: 5, label: 'Cum' },
  { id: 6, label: 'Cts' },
  { id: 7, label: 'Paz' },
];

export const TEACHER_BRANCH_OPTIONS = [
  'Matematik',
  'Geometri',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Türkçe',
  'Türk Dili ve Edebiyatı',
  'Tarih',
  'Coğrafya',
  'Felsefe / Din',
  'İngilizce / Yabancı Dil',
  'Rehberlik & Psikolojik Danışmanlık',
  'Diğer',
];

export const APPROVAL_ENTITY_LABELS = {
  HOMEWORK_DONE: 'Ödev Tamamlama Talebi',
  HOMEWORK_EXTENSION: 'Ödev Ek Süre Talebi',
  SCHEDULE_CHANGE: 'Program Değişikliği',
  PAYMENT_CLAIM: 'Veli Ödeme Bildirimi',
};

export const STUDENT_GRADES = ['4', '5', '6', '7', '8', '9', '10', '11', '12', 'Mezun'];

export const STUDENT_TRACKS = [
  { value: 'SAY', label: 'Sayısal (SAY)' },
  { value: 'EA', label: 'Eşit Ağırlık (EA)' },
  { value: 'SOZ', label: 'Sözel (SÖZ)' },
  { value: 'DIL', label: 'Dil (YDT)' },
  { value: 'ORTAOKUL', label: 'Ortaokul / LGS' },
];

export function parseApprovalPayload(rawPayload) {
  if (!rawPayload) return {};
  if (typeof rawPayload === 'string') {
    try {
      return JSON.parse(rawPayload);
    } catch {
      return {};
    }
  }
  return rawPayload;
}

export function formatCurrencyTRY(amount) {
  const num = parseFloat(amount ?? 0);
  if (Number.isNaN(num)) return '₺0';
  return `₺${num.toLocaleString('tr-TR')}`;
}
