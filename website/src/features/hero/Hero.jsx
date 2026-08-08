export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0a1128] text-white pt-24 pb-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1a2b5e] via-[#0a1128] to-[#0a1128] opacity-70"></div>
      <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Eğitimin Yeni Algoritması: <br/>
          <span className="text-[#fca311] drop-shadow-[0_0_20px_rgba(252,163,17,0.5)]">DersMatris</span>
        </h1>
        <h2 className="text-2xl md:text-3xl text-gray-300 font-medium mb-8">
          Fiziğin Doğasını, Matematiğin Mantığını Keşfet.
        </h2>
        <p className="text-lg text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
          Ezberci sistem bitti. Yeni Maarif Modeline uygun, İTÜ mühendislik vizyonu ve 15 yıllık tecrübeyle tasarlanmış analitik eğitim modeliyle tanışın.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4 flex-wrap">
          <a href="#paketler" className="bg-[#fca311] text-[#0a1128] px-8 py-4 rounded-md font-bold text-lg hover:bg-[#ffb03a] transition-all shadow-[0_0_20px_rgba(252,163,17,0.4)] hover:shadow-[0_0_30px_rgba(252,163,17,0.6)] uppercase tracking-wider">
            Yaz Kampına Katıl
          </a>
          <a href="#neden-biz" className="bg-white/10 text-white border border-white/20 px-8 py-4 rounded-md font-bold text-lg hover:bg-white/20 transition-all uppercase tracking-wider">
            Sistemi İncele
          </a>
          <a href="https://app.dersmatris.com" className="bg-blue-600 text-white px-8 py-4 rounded-md font-bold text-lg hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)] uppercase tracking-wider">
            Sisteme Git &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
