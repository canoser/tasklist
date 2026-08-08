export default function Pricing() {
  return (
    <section id="paketler" className="py-24 bg-white text-[#0a1128]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Paketler ve <span className="text-[#fca311]">Kayıt</span></h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Geleceğinize yatırım yapmak için size en uygun modeli seçin. Sınırlı kontenjanlar dolmadan yerinizi ayırtın.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
          
          {/* Matris Dijital */}
          <div className="bg-white p-10 rounded-3xl border border-gray-200 shadow-sm relative">
            <div className="absolute top-0 right-0 bg-red-100 text-red-700 px-4 py-1 rounded-bl-xl font-bold text-sm">Son 15 Kontenjan</div>
            <h3 className="text-2xl font-bold mb-2">Matris Dijital</h3>
            <p className="text-gray-500 mb-8 font-medium">Online Yaz Kampı</p>
            <div className="mb-8">
              <span className="text-4xl font-extrabold">₺12.500</span>
              <span className="text-gray-500"> / dönem</span>
            </div>
            <ul className="space-y-4 mb-10 text-gray-700 font-medium">
              <li className="flex items-center"><span className="text-blue-500 mr-3 text-xl">✓</span> Türkiye'nin her yerinden erişim</li>
              <li className="flex items-center"><span className="text-blue-500 mr-3 text-xl">✓</span> İnteraktif canlı dersler</li>
              <li className="flex items-center"><span className="text-blue-500 mr-3 text-xl">✓</span> Dijital performans takibi</li>
              <li className="flex items-center"><span className="text-blue-500 mr-3 text-xl">✓</span> Soru çözüm havuzu</li>
            </ul>
            <a href="https://app.dersmatris.com" className="block w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-4 rounded-xl transition-colors">
              Hemen Başvur
            </a>
          </div>

          {/* Matris VIP */}
          <div className="bg-[#0a1128] text-white p-10 rounded-3xl border border-[#fca311]/30 shadow-[0_0_30px_rgba(10,17,40,0.1)] relative transform md:-translate-y-4">
            <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-[#fca311] text-[#0a1128] px-6 py-1.5 rounded-full font-bold text-sm shadow-md">EN ÇOK TERCİH EDİLEN</div>
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider">Sadece Son 2 Grup</div>
            
            <h3 className="text-2xl font-bold mb-2 mt-2">Matris VIP</h3>
            <p className="text-gray-400 mb-8 font-medium">Göktürk Yüz Yüze Eğitim</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold text-white">₺35.000</span>
              <span className="text-gray-400"> / dönem</span>
            </div>
            <ul className="space-y-4 mb-10 text-gray-300 font-medium">
              <li className="flex items-center"><span className="text-[#fca311] mr-3 text-xl">✓</span> Göktürk'te butik yüz yüze koçluk</li>
              <li className="flex items-center"><span className="text-[#fca311] mr-3 text-xl">✓</span> Kişiselleştirilmiş müfredat</li>
              <li className="flex items-center"><span className="text-[#fca311] mr-3 text-xl">✓</span> Can Hoca & Taylan Hoca ile birebir mentörlük</li>
              <li className="flex items-center"><span className="text-[#fca311] mr-3 text-xl">✓</span> Sınav dönemi özel analizleri</li>
            </ul>
            <a href="https://app.dersmatris.com" className="block w-full text-center bg-[#fca311] hover:bg-[#ffb03a] text-[#0a1128] font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(252,163,17,0.3)] hover:shadow-[0_0_20px_rgba(252,163,17,0.5)]">
              Ön Görüşme Randevusu Al
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
