export default function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://dersmatris.com/#organization",
        "name": "DersMatris",
        "url": "https://dersmatris.com",
        "logo": "https://dersmatris.com/logo.png"
      },
      {
        "@type": "Course",
        "@id": "https://dersmatris.com/#course",
        "name": "Matris VIP & Dijital Eğitim Modeli",
        "description": "Yeni Maarif modeline uygun, İTÜ vizyonlu analitik fizik ve matematik eğitim kampı.",
        "provider": {
          "@id": "https://dersmatris.com/#organization"
        },
        "hasCourseInstance": [
          {
            "@type": "CourseInstance",
            "courseMode": "Online",
            "name": "Matris Dijital"
          },
          {
            "@type": "CourseInstance",
            "courseMode": "Onsite",
            "name": "Matris VIP (Göktürk)"
          }
        ]
      },
      {
        "@type": "Person",
        "@id": "https://dersmatris.com/#taylan-hoca",
        "name": "Taylan Hoca",
        "jobTitle": "Matematik Koordinatörü",
        "affiliation": { "@id": "https://dersmatris.com/#organization" }
      },
      {
        "@type": "Person",
        "@id": "https://dersmatris.com/#can-hoca",
        "name": "Can Hoca",
        "jobTitle": "Fizik Koordinatörü",
        "affiliation": { "@id": "https://dersmatris.com/#organization" }
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
