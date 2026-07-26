using System.Collections.Generic;
using System.Linq;
using System.Windows;
using planlama_app.Models;

namespace planlama_app.Windows
{
    public partial class SelectCategoryWindow : Window
    {
        public int? SelectedCategoryId { get; private set; }

        public SelectCategoryWindow(IEnumerable<Category> categories, int? defaultCategoryId = null)
        {
            InitializeComponent();
            var validCategories = categories.Where(c => c.Name != "Tümü").ToList();
            CmbCategories.ItemsSource = validCategories;
            
            if (defaultCategoryId.HasValue)
            {
                CmbCategories.SelectedValue = defaultCategoryId.Value;
            }
            else if (validCategories.Any())
            {
                CmbCategories.SelectedIndex = 0;
            }
        }

        private void BtnOk_Click(object sender, RoutedEventArgs e)
        {
            if (CmbCategories.SelectedValue is int catId)
            {
                SelectedCategoryId = catId;
                DialogResult = true;
                Close();
            }
            else
            {
                planlama_app.Windows.MessageDialogWindow.Show("Lütfen bir kategori seçin.", "Hata", MessageBoxButton.OK, MessageBoxImage.Warning, this);
            }
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
