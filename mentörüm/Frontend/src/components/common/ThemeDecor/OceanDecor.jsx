import React from 'react';
 
 export default function OceanDecor() {
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


      {/* Sağ Üst Hafif Su Kabarcığı & Işıltı Deseni */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          height: '100%',
          width: '120px',
          opacity: 0.25,
        }}
        viewBox="0 0 120 800"
        fill="none"
        preserveAspectRatio="none"
      >
        <circle cx="90" cy="80" r="3" fill="var(--color-accent)" opacity="0.6" />
        <circle cx="40" cy="140" r="2" fill="var(--color-accent)" opacity="0.4" />
        <circle cx="85" cy="220" r="2.5" fill="var(--color-accent)" opacity="0.5" />
        <circle cx="30" cy="310" r="1.8" fill="var(--color-accent)" opacity="0.4" />
        <circle cx="75" cy="400" r="2.2" fill="var(--color-accent)" opacity="0.5" />
        <circle cx="45" cy="520" r="2" fill="var(--color-accent)" opacity="0.4" />
        <circle cx="80" cy="640" r="2.8" fill="var(--color-accent)" opacity="0.5" />
        <circle cx="35" cy="730" r="1.5" fill="var(--color-accent)" opacity="0.3" />
      </svg>

      {/* Ultra Sakin Dalga Animasyon Stilleri (35s ve 45s yavaş salınım) */}
      <style>
        {`
          @keyframes oceanSwayLeft {
            0% { transform: translateX(0); }
            50% { transform: translateX(-10vw); }
            100% { transform: translateX(0); }
          }
          @keyframes oceanSwayRight {
            0% { transform: translateX(-10vw); }
            50% { transform: translateX(0); }
            100% { transform: translateX(-10vw); }
          }
        `}
      </style>

      {/* Ön Katman Dalga (Daha alçak, biraz daha belirgin) */}
      <svg
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: '125vw',
          height: '38vh',
          position: 'absolute',
          bottom: 0,
          left: 0,
          opacity: 0.12,
          animation: 'oceanSwayLeft 35s ease-in-out infinite',
        }}
      >
        <path
          fill="var(--color-primary)"
          d="M0,224L48,208C96,192,192,160,288,165.3C384,171,480,213,576,213.3C672,213,768,171,864,154.7C960,139,1056,149,1152,170.7C1248,192,1344,224,1392,240L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>

      {/* Arka Katman Dalga (Daha yüksek, daha transparan) */}
      <svg
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{
          width: '125vw',
          height: '46vh',
          position: 'absolute',
          bottom: 0,
          left: 0,
          opacity: 0.08,
          animation: 'oceanSwayRight 45s ease-in-out infinite',
        }}
      >
        <path
          fill="var(--color-accent)"
          d="M0,160L48,149.3C96,139,192,117,288,128C384,139,480,181,576,197.3C672,213,768,203,864,181.3C960,160,1056,128,1152,122.7C1248,117,1344,139,1392,149.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
    </div>
  );
}
