using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace planlama_app.Models
{
    /// <summary>
    /// Görevin bağımsız mı yoksa bir zincirin parçası mı olduğunu belirtir.
    /// </summary>
    public enum TaskType
    {
        Bağımsız    = 0,
        Zincirleme  = 1
    }

    /// <summary>
    /// Veritabanındaki Tasks tablosunu temsil eden model sınıfı.
    /// Arayüz bildirimleri için INotifyPropertyChanged uygulanmıştır.
    /// </summary>
    public class TaskItem : INotifyPropertyChanged
    {
        private int _id;
        private string _title = string.Empty;
        private DateTime? _dueDate;
        private bool _isCompleted;
        private TaskType _taskType;
        private string? _chainId;
        private int _orderIndex;
        private int? _estimatedTime;
        private bool _isSelected;
        private int? _categoryId;
        private int? _resourceId;
        private string? _categoryName;
        private string? _resourceTitle;
        private string? _resourceUrl;

        /// <summary>Birincil anahtar. SQLite tarafından otomatik arttırılır.</summary>
        public int Id 
        { 
            get => _id; 
            set { _id = value; OnPropertyChanged(); } 
        }

        /// <summary>Kategori Id. Tümü veya atanmamışsa null.</summary>
        public int? CategoryId 
        { 
            get => _categoryId; 
            set { _categoryId = value; OnPropertyChanged(); } 
        }

        public string? CategoryName
        {
            get => _categoryName;
            set { _categoryName = value; OnPropertyChanged(); }
        }

        /// <summary>Kaynak Id (Sadece Id olarak saklanır).</summary>
        public int? ResourceId
        {
            get => _resourceId;
            set { _resourceId = value; OnPropertyChanged(); }
        }

        public string? ResourceTitle
        {
            get => _resourceTitle;
            set { _resourceTitle = value; OnPropertyChanged(); }
        }

        public string? ResourceUrl
        {
            get => _resourceUrl;
            set { _resourceUrl = value; OnPropertyChanged(); }
        }

        /// <summary>Görevin başlığı. Zorunlu alan.</summary>
        public string Title 
        { 
            get => _title; 
            set { _title = value; OnPropertyChanged(); } 
        }

        /// <summary>Son tamamlanma tarihi. Null olabilir (tarihsiz görev).</summary>
        public DateTime? DueDate 
        { 
            get => _dueDate; 
            set 
            { 
                _dueDate = value; 
                OnPropertyChanged(); 
                OnPropertyChanged(nameof(DateGroup));
                OnPropertyChanged(nameof(DateGroupOrder));
                OnPropertyChanged(nameof(DayGroup));
                OnPropertyChanged(nameof(DayGroupOrder));
                OnPropertyChanged(nameof(WeekGroup));
                OnPropertyChanged(nameof(WeekGroupOrder));
                OnPropertyChanged(nameof(ExactDateGroup));
            } 
        }

        /// <summary>Gruplama için sanal özellik: Gecikmiş, Bugün, vb.</summary>
        public string DateGroup
        {
            get
            {
                if (!DueDate.HasValue) return "👻 Tarihsiz";
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                
                if (date < today) return "🔴 Gecikmiş";
                if (date == today) return "🟢 Bugün";
                if (date == today.AddDays(1)) return "🟡 Yarın";
                if (date <= today.AddDays(7)) return "🔵 Bu Hafta";
                return "⚪ Daha Sonra";
            }
        }

        /// <summary>Gruplama sıralaması için sanal özellik.</summary>
        public int DateGroupOrder
        {
            get
            {
                if (!DueDate.HasValue) return 6;
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                
                if (date < today) return 1;
                if (date == today) return 2;
                if (date == today.AddDays(1)) return 3;
                if (date <= today.AddDays(7)) return 4;
                return 5;
            }
        }

        /// <summary>Gün gün gruplama metni.</summary>
        public string DayGroup
        {
            get
            {
                if (!DueDate.HasValue) return "👻 Tarihsiz";
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                if (date < today) return "🔴 Gecikmiş";
                if (date == today) return $"🟢 Bugün ({date:dd MMMM yyyy, dddd})";
                if (date == today.AddDays(1)) return $"🟡 Yarın ({date:dd MMMM yyyy, dddd})";
                return $"📅 {date:dd MMMM yyyy, dddd}";
            }
        }

        /// <summary>Gün gün gruplama sıralaması.</summary>
        public int DayGroupOrder
        {
            get
            {
                if (!DueDate.HasValue) return 999999;
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                if (date < today) return -1;
                return (date - today).Days + 1;
            }
        }

        /// <summary>Haftalık gruplama metni.</summary>
        public string WeekGroup
        {
            get
            {
                if (!DueDate.HasValue) return "👻 Tarihsiz";
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                if (date < today) return "🔴 Gecikmiş";
                
                int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
                var startOfWeek = today.AddDays(-diff).Date;
                var endOfWeek = startOfWeek.AddDays(6).Date;

                if (date >= startOfWeek && date <= endOfWeek)
                    return $"🟢 Bu Hafta ({startOfWeek:dd MMM} - {endOfWeek:dd MMM})";
                    
                var nextWeekStart = startOfWeek.AddDays(7);
                var nextWeekEnd = endOfWeek.AddDays(7);
                if (date >= nextWeekStart && date <= nextWeekEnd)
                    return $"📆 Gelecek Hafta ({nextWeekStart:dd MMM} - {nextWeekEnd:dd MMM})";

                return $"🗓️ {date:MMMM yyyy}";
            }
        }

        /// <summary>Haftalık gruplama sıralaması.</summary>
        public int WeekGroupOrder
        {
            get
            {
                if (!DueDate.HasValue) return 9999;
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                if (date < today) return -1;
                
                int diff = (7 + (today.DayOfWeek - DayOfWeek.Monday)) % 7;
                var startOfWeek = today.AddDays(-diff).Date;
                var endOfWeek = startOfWeek.AddDays(6).Date;

                if (date >= startOfWeek && date <= endOfWeek) return 1;
                if (date >= startOfWeek.AddDays(7) && date <= endOfWeek.AddDays(7)) return 2;
                return 3 + date.Month;
            }
        }

        /// <summary>Tek bir tarih seçildiğinde gösterilecek özel grup başlığı.</summary>
        public string ExactDateGroup
        {
            get
            {
                if (!DueDate.HasValue) return "👻 Tarihsiz Görevler";
                var date = DueDate.Value.Date;
                var today = DateTime.Today;
                if (date == today) return $"🟢 Bugün ({date:dd MMMM yyyy, dddd})";
                if (date == today.AddDays(1)) return $"🟡 Yarın ({date:dd MMMM yyyy, dddd})";
                if (date < today) return $"🔴 Gecikmiş ({date:dd MMMM yyyy, dddd})";
                return $"📅 {date:dd MMMM yyyy, dddd}";
            }
        }

        /// <summary>Görevin tamamlanıp tamamlanmadığını belirtir.</summary>
        public bool IsCompleted 
        { 
            get => _isCompleted; 
            set { _isCompleted = value; OnPropertyChanged(); } 
        }

        /// <summary>Görev tipi: Bağımsız veya Zincirleme.</summary>
        public TaskType TaskType 
        { 
            get => _taskType; 
            set { _taskType = value; OnPropertyChanged(); } 
        }

        /// <summary>
        /// Zincirleme görevleri gruplamak için kullanılan tanımlayıcı.
        /// Bağımsız görevler için null/boş bırakılır.
        /// </summary>
        public string? ChainId 
        { 
            get => _chainId; 
            set { _chainId = value; OnPropertyChanged(); } 
        }

        /// <summary>
        /// Zincir içindeki sıra numarası.
        /// Bağımsız görevlerde 0 olarak kalır.
        /// </summary>
        public int OrderIndex 
        { 
            get => _orderIndex; 
            set { _orderIndex = value; OnPropertyChanged(); } 
        }

        /// <summary>
        /// Görevin yaklaşık tamamlanma süresi (dakika cinsinden). Null olabilir.
        /// </summary>
        public int? EstimatedTime 
        { 
            get => _estimatedTime; 
            set { _estimatedTime = value; OnPropertyChanged(); } 
        }

        /// <summary>
        /// Arayüzde çoklu seçim checkbox'ı için kullanılan geçici durum. Veritabanına yazılmaz.
        /// </summary>
        public bool IsSelected 
        { 
            get => _isSelected; 
            set { _isSelected = value; OnPropertyChanged(); } 
        }

        // INotifyPropertyChanged Implementasyonu
        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
