import React from 'react';
 
 export default function NatureDecor() {
   return (
     <div
       style={{
         position: 'fixed',
         top: 0,
         left: 0,
         width: '100%',
         height: '100%',
         pointerEvents: 'none',
         zIndex: 0,
         overflow: 'hidden',
       }}
     >


      {/* Yavaş Doğal Salınım Animasyonları */}
      <style>
        {`
          @keyframes natureSwayMain {
            0% { transform: rotate(0deg); }
            50% { transform: rotate(1.2deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes natureSwayBack {
            0% { transform: rotate(0.4deg); }
            50% { transform: rotate(-0.8deg); }
            100% { transform: rotate(0.4deg); }
          }
          @keyframes natureSwayMid1 {
            0% { transform: rotate(-0.5deg); }
            50% { transform: rotate(1.4deg); }
            100% { transform: rotate(-0.5deg); }
          }
          @keyframes natureSwayMid2 {
            0% { transform: scaleX(-1) rotate(0.8deg); }
            50% { transform: scaleX(-1) rotate(-1.1deg); }
            100% { transform: scaleX(-1) rotate(0.8deg); }
          }
          @keyframes natureSwayMid3 {
            0% { transform: rotate(0.2deg); }
            50% { transform: rotate(-1.3deg); }
            100% { transform: rotate(0.2deg); }
          }
        `}
      </style>

      {/* Yeniden kullanılabilir Dal ve Yaprak Şablonu */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <g id="natureBotanicalBranch">
            {/* Ana Dal Hattı */}
            <path
              d="M130 5 Q110 60 90 110 Q65 175 70 240 Q78 310 55 370 Q30 440 45 510 Q60 580 38 640 Q18 710 25 790 Q28 820 20 852"
              stroke="var(--color-primary)"
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
              opacity=".45"
            />
            {/* Yan Dallar */}
            <path d="M110 60 Q125 45 132 38" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".35" strokeLinecap="round" />
            <path d="M90 110 Q75 90 58 82" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".30" strokeLinecap="round" />
            <path d="M70 240 Q88 225 102 222" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".30" strokeLinecap="round" />
            <path d="M55 370 Q38 350 24 345" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".25" strokeLinecap="round" />
            <path d="M45 510 Q62 492 76 488" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".25" strokeLinecap="round" />
            <path d="M38 640 Q22 622 12 618" stroke="var(--color-primary)" strokeWidth="1.1" opacity=".20" strokeLinecap="round" />

            {/* Yapraklar */}
            <ellipse cx="125" cy="40" rx="6" ry="11" fill="var(--color-accent)" opacity=".22" transform="rotate(35 125 40)" />
            <ellipse cx="95" cy="108" rx="8" ry="14" fill="var(--color-accent)" opacity=".24" transform="rotate(16 95 108)" />
            <ellipse cx="56" cy="80" rx="5" ry="10" fill="var(--color-accent)" opacity=".20" transform="rotate(-30 56 80)" />
            <ellipse cx="66" cy="172" rx="6" ry="11" fill="var(--color-accent)" opacity=".18" transform="rotate(-22 66 172)" />
            <ellipse cx="72" cy="238" rx="7" ry="13" fill="var(--color-accent)" opacity=".22" transform="rotate(-6 72 238)" />
            <ellipse cx="104" cy="220" rx="5" ry="10" fill="var(--color-accent)" opacity=".18" transform="rotate(32 104 220)" />
            <ellipse cx="64" cy="305" rx="6" ry="11" fill="var(--color-accent)" opacity=".18" transform="rotate(12 64 305)" />
            <ellipse cx="58" cy="368" rx="7" ry="12" fill="var(--color-accent)" opacity=".20" transform="rotate(8 58 368)" />
            <ellipse cx="22" cy="342" rx="5" ry="9" fill="var(--color-accent)" opacity=".16" transform="rotate(-28 22 342)" />
            <ellipse cx="36" cy="435" rx="6" ry="10" fill="var(--color-accent)" opacity=".16" transform="rotate(-15 36 435)" />
            <ellipse cx="44" cy="508" rx="6" ry="11" fill="var(--color-accent)" opacity=".18" transform="rotate(-6 44 508)" />
            <ellipse cx="78" cy="486" rx="5" ry="9" fill="var(--color-accent)" opacity=".15" transform="rotate(30 78 486)" />
            <ellipse cx="48" cy="575" rx="5" ry="10" fill="var(--color-accent)" opacity=".16" transform="rotate(18 48 575)" />
            <ellipse cx="38" cy="638" rx="6" ry="11" fill="var(--color-accent)" opacity=".16" transform="rotate(5 38 638)" />
            <ellipse cx="26" cy="788" rx="5" ry="8" fill="var(--color-accent)" opacity=".14" transform="rotate(15 26 788)" />

            {/* Tomurcuk & Noktalar */}
            <circle cx="110" cy="62" r="2.5" fill="var(--color-primary)" opacity=".30" />
            <circle cx="68" cy="178" r="2" fill="var(--color-primary)" opacity=".25" />
            <circle cx="50" cy="442" r="2" fill="var(--color-primary)" opacity=".22" />
            <circle cx="85" cy="280" r="1.8" fill="var(--color-primary)" opacity=".20" />
          </g>
        </defs>
      </svg>

      {/* ── ORTA BÖLGE DALLARI (Kutuların arkasından süzülür) ── */}
      {/* 1. Orta-Sol Dal */}
      <svg
        style={{
          position: 'absolute',
          top: '-30px',
          left: '40%',
          height: '100%',
          width: '105px',
          transformOrigin: 'top center',
          animation: 'natureSwayMid1 21s ease-in-out infinite',
          opacity: 0.22,
        }}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* 2. Orta Dal (Aynalanmış) */}
      <svg
        style={{
          position: 'absolute',
          top: '-60px',
          left: '56%',
          height: '100%',
          width: '115px',
          transformOrigin: 'top center',
          animation: 'natureSwayMid2 25s ease-in-out infinite',
          opacity: 0.26,
        }}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* 3. Orta-Sağ Dal */}
      <svg
        style={{
          position: 'absolute',
          top: '-20px',
          left: '72%',
          height: '100%',
          width: '120px',
          transformOrigin: 'top center',
          animation: 'natureSwayMid3 17s ease-in-out infinite',
          opacity: 0.28,
        }}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* ── SAĞ BÖLGE DALLARI ── */}
      {/* Arka Plan Dalı (Daha saydam, hafif kaydırılmış, 20s yavaş salınım) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: '30px',
          height: '100%',
          width: '120px',
          transformOrigin: 'top right',
          animation: 'natureSwayBack 20s ease-in-out infinite',
          opacity: 0.35,
        }}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* Ön Plan Dalı (Ana dal, 14s yavaş salınım) */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: '140px',
          transformOrigin: 'top right',
          animation: 'natureSwayMain 14s ease-in-out infinite',
          opacity: 0.7,
        }}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>
    </div>
  );
}
