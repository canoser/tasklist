import Image from "next/image";

export default function Home() {
  return (
    <div style={{ width: '33.33vw', height: '33.33vw', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Image 
        src="/matrix.jpg" 
        alt="Matrix" 
        fill
        style={{ objectFit: 'contain' }}
        priority
      />
    </div>
  );
}
