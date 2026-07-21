using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace planlama_app.Models
{
    public enum PlatformType
    {
        Web = 0,
        YouTube = 1,
        Udemy = 2,
        GitHub = 3
    }

    public class ResourceItem : INotifyPropertyChanged
    {
        private int _id;
        private string _title = string.Empty;
        private string _url = string.Empty;
        private PlatformType _platform;

        public int Id
        {
            get => _id;
            set { _id = value; OnPropertyChanged(); }
        }

        public string Title
        {
            get => _title;
            set { _title = value; OnPropertyChanged(); }
        }

        public string Url
        {
            get => _url;
            set { _url = value; OnPropertyChanged(); }
        }

        public PlatformType Platform
        {
            get => _platform;
            set { _platform = value; OnPropertyChanged(); }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
