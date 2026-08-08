export default function ProblemStatement() {
  return (
    <section id="neden-biz" className="py-24 bg-white text-[#0a1128]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">9. ve 10. Sınıfta Başlayan <span className="text-red-600">Akademik Uçurumu</span> Fark Ettiniz mi?</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Yeni Maarif Modeli ile birlikte eğitim sistemi değişti. Artık formül ezberlemek değil, analitik düşünmek ve modelleme yapmak gerekiyor. Klasik dershaneler bu yeni dönüşüme hazır değil.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-red-50 p-10 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-100 text-red-700 px-4 py-1 rounded-bl-lg font-bold text-sm">ESKİ SİSTEM</div>
            <h3 className="text-2xl font-bold mb-4 text-red-900">İşlem Hamallığı</h3>
            <ul className="space-y-4 text-red-800/80 font-medium">
              <li className="flex items-start"><span className="mr-2">❌</span> Sadece formül ezberletilir.</li>
              <li className="flex items-start"><span className="mr-2">❌</span> Sorunun "neden" öyle çözüldüğü anlatılmaz.</li>
              <li className="flex items-start"><span className="mr-2">❌</span> Yeni nesil soruları görünce panik başlar.</li>
              <li className="flex items-start"><span className="mr-2">❌</span> Öğrenci konuyu bildiğini sanır ama denemelerde yapamaz.</li>
            </ul>
          </div>
          <div className="bg-blue-50 p-10 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg font-bold text-sm">DERSMATRİS YAKLAŞIMI</div>
            <h3 className="text-2xl font-bold mb-4 text-[#0a1128]">Analitik Modelleme</h3>
            <ul className="space-y-4 text-blue-900/80 font-medium">
              <li className="flex items-start"><span className="mr-2">✅</span> İTÜ mühendislik vizyonuyla konular temellendirilir.</li>
              <li className="flex items-start"><span className="mr-2">✅</span> Formüllerin nereden geldiği ispatlanır.</li>
              <li className="flex items-start"><span className="mr-2">✅</span> Yeni nesil (PISA tarzı) sorulara adaptasyon sağlanır.</li>
              <li className="flex items-start"><span className="mr-2">✅</span> Öğrenci soru tipini ezberlemez, algoritmasını çözer.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
