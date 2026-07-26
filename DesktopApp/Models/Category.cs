using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace planlama_app.Models
{
    public class Category : INotifyPropertyChanged
    {
        private int _id;
        private string _name = string.Empty;
        private int _taskCount;
        private string? _colorHex;

        public int Id
        {
            get => _id;
            set { _id = value; OnPropertyChanged(); }
        }

        public string Name
        {
            get => _name;
            set { _name = value; OnPropertyChanged(); OnPropertyChanged(nameof(DisplayName)); }
        }

        public int TaskCount
        {
            get => _taskCount;
            set { _taskCount = value; OnPropertyChanged(); OnPropertyChanged(nameof(DisplayName)); }
        }

        public string? ColorHex
        {
            get => _colorHex;
            set { _colorHex = value; OnPropertyChanged(); }
        }

        public string DisplayName => TaskCount > 0 ? $"{Name} ({TaskCount})" : Name;

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
