export default function Footer() {
  return (
    <footer className="w-full bg-[#050814] text-gray-400 py-12 border-t border-white/5" id="iletisim">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="text-2xl font-bold text-white tracking-tight mb-4">
            Ders<span className="text-[#fca311]">Matris</span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs">
            Yeni Maarif modeline uygun, İTÜ vizyonu ile geliştirilmiş analitik fizik ve matematik eğitim kampı. Ezberden uzak, kök mantık inşası.
          </p>
        </div>
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Hızlı Bağlantılar</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="#sistemimiz" className="hover:text-[#fca311] transition-colors">Sistemimiz</a></li>
            <li><a href="#neden-biz" className="hover:text-[#fca311] transition-colors">Maarif Modeli & Kriz</a></li>
            <li><a href="#paketler" className="hover:text-[#fca311] transition-colors">Kayıt & Paketler</a></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">İletişim & Lokasyon</h3>
          <ul className="space-y-2 text-sm">
            <li>📍 VIP Yüz Yüze: Göktürk / Kemerburgaz</li>
            <li>🌐 Dijital Kamp: Tüm Türkiye'den Erişim</li>
            <li>
              <a href="https://app.dersmatris.com" className="inline-block mt-4 text-[#fca311] hover:text-white transition-colors font-semibold border-b border-[#fca311] hover:border-white pb-1">
                Öğrenci Paneline Giriş Yap &rarr;
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-xs text-center">
        &copy; {new Date().getFullYear()} DersMatris. Tüm hakları saklıdır.
      </div>
    </footer>
  );
}
