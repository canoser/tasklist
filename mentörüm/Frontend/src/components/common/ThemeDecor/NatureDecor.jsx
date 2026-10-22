import React from 'react';
import styles from './NatureDecor.module.css';
 
export default function NatureDecor() {
  return (
    <div className={styles.container}>


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

      {/* ── ORTA BÖLGE DALLARI (Mobilde gizlenerek dal yoğunluğu yarıya iner) ── */}
      {/* 1. Orta-Sol Dal */}
      <svg
        className={styles.branchMid1}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* 2. Orta Dal (Aynalanmış) */}
      <svg
        className={styles.branchMid2}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* 3. Orta-Sağ Dal */}
      <svg
        className={styles.branchMid3}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* ── SAĞ BÖLGE DALLARI (Her ekranda zarif kenar dekoru olarak kalır) ── */}
      {/* Arka Plan Dalı */}
      <svg
        className={styles.branchBackRight}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>

      {/* Ön Plan Dalı */}
      <svg
        className={styles.branchMainRight}
        viewBox="0 0 140 852"
        fill="none"
        preserveAspectRatio="none"
      >
        <use href="#natureBotanicalBranch" />
      </svg>
    </div>
  );
}
