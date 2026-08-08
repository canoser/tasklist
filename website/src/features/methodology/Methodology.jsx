export default function Methodology() {
  return (
    <section id="sistemimiz" className="py-24 bg-[#f8fafc] text-[#0a1128] border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Neden <span className="text-blue-600">"Matris"</span>?</h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
            Bilgi doğrusal (lineer) değildir; bir matristir. Fizik ve Matematik birbirine bağlı devasa bir mantık ızgarasıdır. Can Hoca (Fizik) ve Taylan Hoca (Matematik) liderliğindeki 15 yıllık pedagojik tecrübeyle bu matrisi çözmeyi öğretiyoruz.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl mb-6">1</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a1128]">Kök Mantık İnşası</h3>
            <p className="text-gray-600 leading-relaxed">
              Hiçbir formül gökten inmez. Öğrenciye bir denklemin veya kuralın nereden çıktığını, temel felsefesini mühendislik bakış açısıyla kavratıyoruz.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl mb-6">2</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a1128]">Algoritmik Soru Çözümü</h3>
            <p className="text-gray-600 leading-relaxed">
              Karmaşık problemlere rastgele saldırmak yerine, problemi küçük parçalara bölme ve adım adım algoritma oluşturma becerisi kazandırıyoruz.
            </p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-2xl mb-6">3</div>
            <h3 className="text-xl font-bold mb-3 text-[#0a1128]">Yeni Nesil Adaptasyon</h3>
            <p className="text-gray-600 leading-relaxed">
              Kök mantığı oturan ve algoritma kurabilen öğrenci, MEB'in ve ÖSYM'nin yeni nesil (yeni maarif modeli) zorlayıcı sorularını kolayca okuyup çözer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
