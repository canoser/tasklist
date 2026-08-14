import ICAL from 'ical.js';

export const parseICS = (icsString, tone, t) => {
  try {
    const jcalData = ICAL.parse(icsString);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');
    
    return vevents.map(event => {
      const e = new ICAL.Event(event);
      
      return {
        title: e.summary || (t ? t('untitled_event', { context: tone, defaultValue: 'Başlıksız Etkinlik' }) : 'Başlıksız Etkinlik'),
        description: e.description || '',
        deadline: e.startDate ? e.startDate.toJSDate().toISOString() : null,
        endDate: e.endDate ? e.endDate.toJSDate().toISOString() : null,
        isCompleted: false,
        categoryId: null, // Unassigned
        chainId: null, // Unassigned
        roleName: null, // Unassigned
      };
    });
  } catch (err) {
    console.error("ICS Parse Error:", err);
    throw new Error(t ? t('ics_parse_error', { context: tone, defaultValue: 'Geçersiz veya bozuk bir takvim dosyası.' }) : 'Geçersiz veya bozuk bir takvim dosyası.');
  }
};
