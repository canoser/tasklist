export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#0a1128]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-2xl font-bold text-white tracking-tight">
          Ders<span className="text-[#fca311]">Matris</span>
        </div>
        <nav className="hidden md:block">
          <ul className="flex space-x-8 text-gray-300 font-medium text-sm tracking-wide">
            <li><a href="#sistemimiz" className="hover:text-white hover:text-shadow-sm transition-all">Sistemimiz</a></li>
            <li><a href="#neden-biz" className="hover:text-white hover:text-shadow-sm transition-all">Neden Biz?</a></li>
            <li><a href="#paketler" className="hover:text-white hover:text-shadow-sm transition-all">Paketler</a></li>
            <li><a href="#iletisim" className="hover:text-white hover:text-shadow-sm transition-all">İletişim</a></li>
          </ul>
        </nav>
        <div>
          <a href="#paketler" className="bg-[#fca311] text-[#0a1128] px-5 py-2.5 rounded font-bold text-sm hover:bg-[#ffb03a] transition-all shadow-[0_0_15px_rgba(252,163,17,0.3)] hover:shadow-[0_0_20px_rgba(252,163,17,0.6)] uppercase tracking-wider">
            Kontenjan Sorgula
          </a>
        </div>
      </div>
    </header>
  );
}
