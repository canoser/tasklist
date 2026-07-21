using System;
using System.Windows;
using System.Windows.Controls;
using planlama_app.Data;
using planlama_app.Models;

namespace planlama_app
{
    /// <summary>
    /// EditTaskWindow.xaml için code-behind.
    /// Görev detaylarını günceller ve veritabanına kaydeder.
    /// </summary>
    public partial class EditTaskWindow : Window
    {
        private readonly TaskItem _task;
        private readonly TaskItem _originalTask;
        private readonly TaskRepository _repository = new();

        public EditTaskWindow(TaskItem task)
        {
            InitializeComponent();
            _task = task ?? throw new ArgumentNullException(nameof(task));
            
            _originalTask = new TaskItem
            {
                Id = task.Id, Title = task.Title, DueDate = task.DueDate, EstimatedTime = task.EstimatedTime,
                TaskType = task.TaskType, ChainId = task.ChainId, OrderIndex = task.OrderIndex, 
                CategoryId = task.CategoryId, IsCompleted = task.IsCompleted
            };

            PopulateForm();
        }

        private async void PopulateForm()
        {
            TxtTitle.Text = _task.Title;
            DpDueDate.SelectedDate = _task.DueDate;
            TxtEstTime.Text = _task.EstimatedTime?.ToString() ?? string.Empty;
            CmbType.SelectedIndex = (int)_task.TaskType;
            CmbChainId.Text = _task.ChainId ?? string.Empty;
            TxtOrderIndex.Text = _task.OrderIndex.ToString();

            // Kategorileri Yükle
            var categoryRepo = new CategoryRepository();
            var categories = await categoryRepo.GetAllAsync();
            CmbCategory.ItemsSource = categories;
            CmbCategory.SelectedValue = _task.CategoryId;

            // Mevcut zincirleri yükle
            var allTasks = await _repository.GetAllTasksAsync();
            var chains = System.Linq.Enumerable.ToList(System.Linq.Enumerable.Distinct(System.Linq.Enumerable.Select(
                System.Linq.Enumerable.Where(allTasks, t => t.TaskType == TaskType.Zincirleme && !string.IsNullOrEmpty(t.ChainId)), 
                t => t.ChainId)));
            
            CmbChainId.ItemsSource = chains;

            ToggleChainFields();
        }

        private void ToggleChainFields()
        {
            bool isChain = CmbType.SelectedIndex == 1;
            CmbChainId.IsEnabled = isChain;
            TxtOrderIndex.IsEnabled = isChain;

            if (!isChain)
            {
                CmbChainId.Text = string.Empty;
                TxtOrderIndex.Text = "0";
            }
        }

        private void CmbType_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CmbChainId == null || TxtOrderIndex == null) return;
            ToggleChainFields();
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            DialogResult = false;
            Close();
        }

        private async void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            string title = TxtTitle.Text.Trim();
            if (string.IsNullOrEmpty(title))
            {
                planlama_app.Windows.MessageDialogWindow.Show("Görev başlığı boş olamaz.", "Doğrulama Hatası", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                return;
            }

            if (CmbCategory.SelectedValue == null)
            {
                planlama_app.Windows.MessageDialogWindow.Show("Lütfen bir kategori seçin (Tümü sekmesine ekleme yapılamaz).", "Doğrulama Hatası", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                return;
            }

            int? estTime = null;
            string rawEstTime = TxtEstTime.Text.Trim();
            if (!string.IsNullOrEmpty(rawEstTime))
            {
                if (!int.TryParse(rawEstTime, out int parsedTime) || parsedTime < 0)
                {
                    planlama_app.Windows.MessageDialogWindow.Show("Yaklaşık süre negatif olmayan bir tamsayı (dakika) olmalıdır.", "Doğrulama Hatası", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                    return;
                }
                estTime = parsedTime;
            }

            TaskType taskType = (TaskType)CmbType.SelectedIndex;
            string? chainId = CmbChainId.Text.Trim();
            int orderIndex = 0;

            if (taskType == TaskType.Zincirleme)
            {
                if (string.IsNullOrEmpty(chainId))
                {
                    planlama_app.Windows.MessageDialogWindow.Show("Zincirleme görevler için ChainId boş bırakılamaz.", "Doğrulama Hatası", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                    return;
                }

                if (!int.TryParse(TxtOrderIndex.Text.Trim(), out orderIndex) || orderIndex < 0)
                {
                    planlama_app.Windows.MessageDialogWindow.Show("Sıra numarası negatif olmayan bir tamsayı olmalıdır.", "Doğrulama Hatası", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                    return;
                }
            }
            else
            {
                chainId = null;
            }

            _task.Title = title;
            _task.DueDate = DpDueDate.SelectedDate;
            _task.EstimatedTime = estTime;
            _task.TaskType = taskType;
            _task.ChainId = chainId;
            _task.OrderIndex = orderIndex;
            _task.CategoryId = CmbCategory.SelectedValue as int?;

            try
            {
                if (_task.Id == 0)
                {
                    _task.Id = await _repository.AddAsync(_task);
                    planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction { ActionType = planlama_app.Services.UndoActionType.Add, Task = _task });
                }
                else
                {
                    await _repository.UpdateAsync(_task);
                    planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction { ActionType = planlama_app.Services.UndoActionType.Update, PreviousState = _originalTask, Task = _task });
                }
                
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kayıt sırasında hata oluştu:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }
    }
}
