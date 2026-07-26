using System;
using System.Collections.Generic;
using System.Linq;
using System.Windows;
using planlama_app.Data;
using planlama_app.Models;

namespace planlama_app.Windows
{
    public partial class SelectResourceWindow : Window
    {
        private readonly ResourceRepository _resourceRepo = new();

        public int? SelectedResourceId { get; private set; }

        public SelectResourceWindow(IEnumerable<ResourceItem> resources, string targetName = "")
        {
            InitializeComponent();
            
            if (!string.IsNullOrWhiteSpace(targetName))
            {
                TxtHeaderTitle.Text = $"'{targetName}' İçin Kaynak Bağla";
            }

            CmbResources.ItemsSource = resources.ToList();
        }

        private async void BtnOk_Click(object sender, RoutedEventArgs e)
        {
            // 1) Eğer yeni kaynak girildiyse onu oluştur
            if (ExpNewResource.IsExpanded && !string.IsNullOrWhiteSpace(TxtNewTitle.Text))
            {
                var newRes = new ResourceItem
                {
                    Title = TxtNewTitle.Text.Trim(),
                    Url = TxtNewUrl.Text.Trim()
                };

                SelectedResourceId = await _resourceRepo.AddAsync(newRes);
                DialogResult = true;
                Close();
                return;
            }

            // 2) Mevcut kaynak seçildiyse onu kullan
            if (CmbResources.SelectedValue is int resId)
            {
                SelectedResourceId = resId;
                DialogResult = true;
                Close();
                return;
            }

            // Seçim yapılmadıysa uyarı ver
            MessageDialogWindow.Show("Lütfen mevcut bir kaynak seçin ya da yeni kaynak bilgisi girin.", "Kaynak Seçimi", MessageBoxButton.OK, MessageBoxImage.Warning, this);
        }

        private void BtnClear_Click(object sender, RoutedEventArgs e)
        {
            SelectedResourceId = null;
            DialogResult = true;
            Close();
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }
    }
}
