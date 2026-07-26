using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;
using System.Windows.Media;
using MaterialDesignThemes.Wpf;
using planlama_app.Models;

namespace planlama_app.Converters
{
    // ---------------------------------------------------------------
    // Bool → Strikethrough Opacity (tamamlananlar soluk görünür)
    // ---------------------------------------------------------------
    public class BoolToOpacityConverter : IValueConverter
    {
        public object Convert(object value, Type t, object p, CultureInfo c)
            => value is true ? 0.4 : 1.0;

        public object ConvertBack(object v, Type t, object p, CultureInfo c)
            => throw new NotImplementedException();
    }

    // ---------------------------------------------------------------
    // Bool → Check İkonu (tamamlandı / bekliyor)
    // ---------------------------------------------------------------
    public class BoolToCheckIconConverter : IValueConverter
    {
        public object Convert(object value, Type t, object p, CultureInfo c)
            => value is true ? PackIconKind.CheckCircle : PackIconKind.CircleOutline;

        public object ConvertBack(object v, Type t, object p, CultureInfo c)
            => throw new NotImplementedException();
    }

    // ---------------------------------------------------------------
    // Bool → Renk (tamamlandı = yeşil, bekliyor = gri)
    // ---------------------------------------------------------------
    public class BoolToGreenGrayConverter : IValueConverter
    {
        public object Convert(object value, Type t, object p, CultureInfo c)
            => value is true
                ? new SolidColorBrush(Color.FromRgb(0x4C, 0xAF, 0x50))   // Yeşil
                : new SolidColorBrush(Color.FromRgb(0x9E, 0x9E, 0x9E));  // Gri

        public object ConvertBack(object v, Type t, object p, CultureInfo c)
            => throw new NotImplementedException();
    }

    // ---------------------------------------------------------------
    // DueDate → Badge Arka Plan Rengi
    //   Geçmiş tarih → Kırmızı
    //   Bugün/Yarın  → Turuncu
    //   İleri tarih  → Mor (Primary)
    //   Null         → Şeffaf
    // ---------------------------------------------------------------
    public class DueDateToColorConverter : IValueConverter
    {
        public object Convert(object value, Type t, object p, CultureInfo c)
        {
            if (value is not DateTime due)
                return Brushes.Transparent;

            var today = DateTime.Today;

            if (due.Date < today)
                return new SolidColorBrush(Color.FromRgb(0xE5, 0x39, 0x35));   // Kırmızı
            if (due.Date <= today.AddDays(1))
                return new SolidColorBrush(Color.FromRgb(0xF5, 0x7C, 0x00));   // Turuncu
            return new SolidColorBrush(Color.FromRgb(0x51, 0x2D, 0xA8));       // Mor
        }

        public object ConvertBack(object v, Type t, object p, CultureInfo c)
            => throw new NotImplementedException();
    }

    // ---------------------------------------------------------------
    // TaskType → Rozet Rengi (Bağımsız = Mavi-gri, Zincirleme = Cyan)
    // ---------------------------------------------------------------
    public class TaskTypeToBrushConverter : IValueConverter
    {
        public object Convert(object value, Type t, object p, CultureInfo c)
            => value is TaskType.Zincirleme
                ? new SolidColorBrush(Color.FromRgb(0x00, 0x96, 0x88))   // Teal
                : new SolidColorBrush(Color.FromRgb(0x45, 0x68, 0x7A));  // Mavi-gri

        public object ConvertBack(object v, Type t, object p, CultureInfo c)
            => throw new NotImplementedException();
    }
}
