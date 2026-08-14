import storage from './utils/storage';

export const seedDummyTasks = () => {
  // Test için rastgele görevler oluştur.
  const now = new Date();
  const tasks = [];
  
  const roles = ['Geliştirici', 'Birey', 'Öğrenci'];
  
  const titles = [
    'Raporu tamamla', 'E-postaları cevapla', 'Takım Toplantısı', 'Su iç', 'Spor yap (45dk)', 
    'Kitap oku (20 sayfa)', 'Market Alışverişi', 'Faturayı öde', 'İngilizce çalış', 'Kod yaz (2 Saat)',
    'Sunum hazırla', 'Meditasyon (10dk)', 'Yürüyüş', 'Evi temizle', 'Podcast dinle', 'Kargoyu al',
    'Randevu', 'Tasarım incelemesi'
  ];

  let idCounter = 1000;

  // Son 7 gün ile önümüzdeki 14 gün arasına rastgele görev ata
  for (let i = -7; i <= 14; i++) {
    // Günde ortalama 2 ile 5 arası rastgele görev
    const taskCount = Math.floor(Math.random() * 4) + 2;
    
    for (let j = 0; j < taskCount; j++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(10, 0, 0, 0); // Saat önemli değil, günlük bazda alınacak

      // Geçmiş görevler genelde tamamlanmış olsun, gelecekler tamamlanmamış
      const isPast = i < 0;
      const isCompleted = isPast ? (Math.random() > 0.2) : (Math.random() > 0.8);

      tasks.push({
        id: `local_${idCounter++}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        deadline: d.toISOString(),
        isCompleted: isCompleted,
        categoryId: Math.floor(Math.random() * 3) + 1, // 1, 2, 3 kategorileri
        chainId: Math.random() > 0.7 ? (Math.floor(Math.random() * 2) + 1) : null, // Bazıları zincir görevi
        roleName: roles[Math.floor(Math.random() * roles.length)],
        createdAt: new Date().toISOString()
      });
    }
  }

  storage.set('guest_tasks', tasks);
  console.log("Geçici test görevleri localStorage'a yüklendi!");
};
