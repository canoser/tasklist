using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace planlama_app.Converters
{
    public class GroupColorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is string groupName)
            {
                if (groupName.Contains("Gecikmiş"))
                    return new SolidColorBrush(Color.FromRgb(255, 82, 82)); // Red
                if (groupName.Contains("Bugün"))
                    return new SolidColorBrush(Color.FromRgb(33, 150, 243)); // Blue
                if (groupName.Contains("Yarın"))
                    return new SolidColorBrush(Color.FromRgb(255, 193, 7)); // Amber
                if (groupName.Contains("Bu Hafta"))
                    return new SolidColorBrush(Color.FromRgb(156, 39, 176)); // Purple
                if (groupName.Contains("Daha Sonra"))
                    return new SolidColorBrush(Color.FromRgb(158, 158, 158)); // Grey
                if (groupName.Contains("Tarihsiz"))
                    return new SolidColorBrush(Color.FromRgb(96, 125, 139)); // BlueGrey
            }
            
            return new SolidColorBrush(Colors.White); // Varsayılan
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
