using System;
using System.Globalization;
using System.Windows.Data;

namespace planlama_app.Converters
{
    public class GroupExpandedConverter : IValueConverter
    {
        public static TaskListGroupMode CurrentMode { get; set; } = TaskListGroupMode.Standard;

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (CurrentMode == TaskListGroupMode.Daily)
            {
                return true; // Gün gösterilecekse görevler açık olarak görünsün
            }

            if (CurrentMode == TaskListGroupMode.Weekly)
            {
                return false; // Hafta gösterilecekse kapalı gelsin
            }

            if (value is string groupName)
            {
                // Varsayılan modda Gecikmiş ve Bugün grupları açık
                if (groupName.Contains("Gecikmiş") || groupName.Contains("Bugün"))
                {
                    return true;
                }
            }

            return false;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
