# 📋 Planlama App - Görev & Kaynak Yönetimi

**Planlama App**, modern WPF (.NET 9) mimarisi kullanılarak geliştirilmiş; günlük görevlerinizi, projelerinizi, kategorilerinizi ve kaynaklarınızı organize etmenizi sağlayan masaüstü planlama uygulamasıdır.

---

## ✨ Özellikler

- **📋 Detaylı Görev Takibi:** Görev ekleme, güncelleme, silme, durum (Tamamlandı/Bekliyor) ve önem derecesi takibi.
- **🏷️ Kategori Yönetimi:** Görevleri farklı renk ve gruplarla kategorize edebilme.
- **📁 Kaynak Takibi:** Görevlerle ilişkili kaynak ve materyalleri yönetme.
- **🎨 Modern Material Design Arayüzü:** `MaterialDesignThemes` kütüphanesi ve özel tema yöneticisi ile göz yormayan, şık tasarım.
- **💾 SQLite & Dapper Altyapısı:** Hızlı, güvenilir ve yerel veritabanı performanslı veri depolama.
- **↩️ Geri Al / İleri Al (Undo/Redo):** Yapılan işlemleri kolayca geri alma veya yineleme imkanı.
- **📥 Şablon İçe/Dışa Aktarım:** Hazır şablon görevleri hızlıca içe aktarma desteği.

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
   *Alternatif olarak kök dizindeki `build.bat` dosyasını çalıştırabilirsiniz.*

---

## 📁 Proje Yapısı

```
planlama_app/
├── Converters/          # WPF Data Binding dönüştürücüleri
├── Data/                # DatabaseHelper, Dapper Repository katmanları
├── Models/              # TaskItem, Category, ResourceItem modelleri
├── Services/            # ImportService, UndoManager servisleri
├── Themes/              # ThemeManager ve özel stil/tema dosyaları
├── Windows/             # Özel diyalog ve seçim pencereleri
├── App.xaml             # Uygulama başlangıcı ve kaynaklar
└── MainWindow.xaml      # Ana uygulama arayüzü
```

---

## 📄 Lisans
Bu proje kişisel kullanım ve geliştirme amacıyla hazırlanmıştır.
