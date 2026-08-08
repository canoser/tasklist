export default function FinalCta() {
  return (
    <section className="py-24 bg-[#fca311] text-[#0a1128] relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">Ağustos Dönemeci Kapanıyor.</h2>
        <p className="text-xl md:text-2xl font-medium mb-10 text-[#0a1128]/80 leading-relaxed">
          Okul temposu başladığında yeni sisteme adapte olmak için vakit kalmayacak. Analitik altyapıyı kurmak için son sakin dönemeçtesiniz.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="https://wa.me/905555555555" className="bg-[#0a1128] text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-black transition-all shadow-xl hover:shadow-2xl flex items-center justify-center">
            <span className="mr-2">WhatsApp'tan Ulaşın</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
