# 📋 TaskList - Görev, Takvim & Planlama Yönetimi

**TaskList**, modern WPF (.NET 9) mimarisi ve Material Design ile geliştirilmiş; görevlerinizi, projelerinizi, kategorilerinizi ve takviminizi tek bir yerden yönetmenizi sağlayan masaüstü planlama uygulamasıdır.

---

## ✨ Yeni Özellikler & Yenilikler (v1.1)

- **📅 Entegre Takvim Görünümü (Calendar View):** Görevlerinizi ay ve gün bazında takvim gridi üzerinde görüntüleme, tarihe özel hızlı görev ekleme ve filtreneme.
- **🔀 Görünüm Seçenekleri (Modlar):**
  - **📅 Takvim Görünümü:** Tam ekran takvim matrisi.
  - **📋 Liste Görünümü:** Filtrelenebilir ve gruplanabilir detaylı görev listesi.
  - **🔀 Bölünmüş Görünüm (Split View):** Sol tarafta takvim gridi, sağ tarafta seçili güne/gruba ait görev listesi.
- **🏷️ Profesyonel Sekme & Görev Grubu Kurgusu:**
  - Sekmelerde aktif görev sayıları rozet (badge) olarak gösterilir (örn: `İş (5)`, `Kişisel (3)`).
  - Sekme değiştiğinde hem Takvim hem de Liste görünümü anında filtrelenir.
  - Sağ tık menüsü ile kategori yeniden adlandırma ve silme yönetimi.

---

## 🛠️ Kullanılan Teknolojiler

| Teknoloji / Kütüphane | Sürüm / Açıklama |
| :--- | :--- |
| **.NET SDK** | 9.0 (WPF - Windows) |
| **C#** | Modern C# 13 |
| **SQLite** | `Microsoft.Data.Sqlite` (v10.0.9) |
| **Dapper** | ORM altyapısı (v2.1.79) |
| **MaterialDesignThemes** | Modern UI Bileşenleri (v5.3.2) |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- [.NET 9.0 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- Windows 10 / 11

### Projeyi Klonlama ve Çalıştırma

1. Repoyu klonlayın:
   ```bash
   git clone https://github.com/canoser/tasklist.git
   cd tasklist
   ```

2. Projeyi derleyin ve çalıştırın:
   ```bash
   dotnet build
   dotnet run
   ```

---

## 📁 Proje Yapısı

```
planlama_app/
├── Converters/          # WPF Data Binding dönüştürücüleri
├── Data/                # DatabaseHelper, Dapper Repository katmanları
├── Models/              # TaskItem, Category, ResourceItem modelleri
├── Services/            # ImportService, UndoManager servisleri
├── Themes/              # ThemeManager ve özel stil/tema dosyaları
├── Views/               # CalendarView takvim modülü
├── Windows/             # Özel diyalog ve seçim pencereleri
├── App.xaml             # Uygulama başlangıcı ve kaynaklar
└── MainWindow.xaml      # Ana uygulama arayüzü
```

---

## 📄 Lisans
Bu proje kişisel kullanım ve geliştirme amacıyla hazırlanmıştır.
