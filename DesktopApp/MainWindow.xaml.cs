using System;
using System.ComponentModel;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Data;
using System.Windows.Controls;
using Dapper;
using Microsoft.Win32;
using planlama_app.Data;
using planlama_app.Models;
using planlama_app.Services;
using planlama_app.Converters;

using System.Windows.Media.Animation;

namespace planlama_app
{
    /// <summary>
    /// Sidebar için kategori bağlama modeli.
    /// </summary>
    public class SidebarCategoryItem
    {
        public int? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int TaskCount { get; set; }
        public string DisplayName => Name;
        public Category? Category { get; set; }
    }

    /// <summary>
    /// MainWindow code-behind: Modern UI/UX mimarisini ve Arama/Redo mantığını yönetir.
    /// </summary>
    public partial class MainWindow : Window
    {
        // ---------------------------------------------------------------
        // Bağımlılıklar
        // ---------------------------------------------------------------
        private readonly TaskRepository _repository = new();
        private readonly CategoryRepository _categoryRepo = new();
        private readonly ResourceRepository _resourceRepo = new();
        private readonly ImportService _importService;

        // ---------------------------------------------------------------
        // Durum (State)
        // ---------------------------------------------------------------
        private List<TaskItem> _allTasks = new();
        private DateTime? _calendarSelectedDate;
        private bool _isSearchOpen = false;
        private TaskListGroupMode _listViewGroupMode = TaskListGroupMode.Standard;

        // ---------------------------------------------------------------
        // Yapıcı
        // ---------------------------------------------------------------
        public MainWindow()
        {
            InitializeComponent();
            _importService = new ImportService(_repository);

            string savedTheme = planlama_app.Themes.ThemeManager.LoadTheme();
            foreach (ComboBoxItem item in CmbTheme.Items)
            {
                if (item.Content != null && item.Content.ToString() == savedTheme)
                {
                    CmbTheme.SelectedItem = item;
                    break;
                }
            }

            // Takvim Kontrolü Olay Dinleyicileri (Event Wire-up)
            CalendarControl.DateSelected += CalendarControl_DateSelected;
            CalendarControl.AddTaskRequested += CalendarControl_AddTaskRequested;
            CalendarControl.TaskClicked += CalendarControl_TaskClicked;

            // Pencere açılışında kategorileri, görevleri ve kaynakları yükle
            Loaded += async (_, _) => 
            {
                await LoadTasksAsync();
                await LoadCategoriesAsync();
                await LoadResourcesAsync();
                UpdateViewModeLayout();
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TEMA VE ARAMA YÖNETİMİ (KAYAR ARAMA KUTUSU)
        // ═══════════════════════════════════════════════════════════════

        private void CmbTheme_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CmbTheme?.SelectedItem is ComboBoxItem item && item.Content != null)
            {
                string themeName = item.Content.ToString()!;
                planlama_app.Themes.ThemeManager.ApplyTheme(themeName);
                SetStatus($"🎨 Tema uygulandı: {themeName}");
            }
        }

        private void BtnSearchToggle_Click(object sender, RoutedEventArgs e)
        {
            if (_isSearchOpen)
            {
                CloseSearchBox();
            }
            else
            {
                OpenSearchBox();
            }
        }

        private void OpenSearchBox()
        {
            if (_isSearchOpen) return;
            _isSearchOpen = true;

            var anim = new DoubleAnimation
            {
                From = BorderSearchBox.Width,
                To = 220,
                Duration = TimeSpan.FromMilliseconds(250),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };

            anim.Completed += (s, e) =>
            {
                TxtSearch.Focus();
            };

            BorderSearchBox.BeginAnimation(FrameworkElement.WidthProperty, anim);
        }

        private void CloseSearchBox()
        {
            if (!_isSearchOpen) return;
            _isSearchOpen = false;

            var anim = new DoubleAnimation
            {
                From = BorderSearchBox.Width,
                To = 0,
                Duration = TimeSpan.FromMilliseconds(200),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseIn }
            };

            anim.Completed += (s, e) =>
            {
                TxtSearch.Text = string.Empty;
            };

            BorderSearchBox.BeginAnimation(FrameworkElement.WidthProperty, anim);
        }

        private void Window_PreviewMouseDown(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if (_isSearchOpen && BorderSearchBox != null && BtnSearchToggle != null)
            {
                Point mousePosSearch = e.GetPosition(BorderSearchBox);
                Point mousePosBtn = e.GetPosition(BtnSearchToggle);

                bool isClickInsideSearch = mousePosSearch.X >= 0 && mousePosSearch.X <= BorderSearchBox.ActualWidth &&
                                           mousePosSearch.Y >= 0 && mousePosSearch.Y <= BorderSearchBox.ActualHeight;

                bool isClickInsideBtn = mousePosBtn.X >= 0 && mousePosBtn.X <= BtnSearchToggle.ActualWidth &&
                                        mousePosBtn.Y >= 0 && mousePosBtn.Y <= BtnSearchToggle.ActualHeight;

                if (!isClickInsideSearch && !isClickInsideBtn)
                {
                    CloseSearchBox();
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // VERİ YÜKLEME
        // ═══════════════════════════════════════════════════════════════

        private async Task LoadTasksAsync()
        {
            SetLoading(true, "Görevler yükleniyor...");
            try
            {
                _allTasks = (await _repository.GetAllTasksAsync()).ToList();

                if (BtnUndo != null) BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;
                if (BtnRedo != null) BtnRedo.IsEnabled = planlama_app.Services.UndoManager.CanRedo;

                await RefreshCategoryBadgesAsync();
                ApplyFilter();
                UpdateDeleteSelectedButtonState();
                SetStatus($"Toplam {_allTasks.Count} görev yüklendi.");
            }
            catch (Exception ex)
            {
                SetStatus($"Hata: {ex.Message}");
                planlama_app.Windows.MessageDialogWindow.Show(ex.Message, "Veri Yükleme Hatası",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // KATEGORİ SEKMELERİ (Sol Sidebar Görev Grupları)
        // ═══════════════════════════════════════════════════════════════

        private async Task LoadCategoriesAsync()
        {
            try
            {
                var categories = await _categoryRepo.GetAllAsync();
                int? currentlySelectedId = (LstSidebarCategories.SelectedItem as SidebarCategoryItem)?.Id;

                var sidebarItems = new List<SidebarCategoryItem>
                {
                    new SidebarCategoryItem { Id = null, Name = "🏠 Tüm Görevler", TaskCount = _allTasks.Count }
                };

                foreach (var cat in categories)
                {
                    int count = _allTasks.Count(t => t.CategoryId == cat.Id);
                    sidebarItems.Add(new SidebarCategoryItem
                    {
                        Id = cat.Id,
                        Name = cat.Name,
                        TaskCount = count,
                        Category = cat
                    });
                }

                LstSidebarCategories.ItemsSource = sidebarItems;

                int selectIndex = 0;
                if (currentlySelectedId.HasValue)
                {
                    for (int i = 1; i < sidebarItems.Count; i++)
                    {
                        if (sidebarItems[i].Id == currentlySelectedId.Value)
                        {
                            selectIndex = i;
                            break;
                        }
                    }
                }

                LstSidebarCategories.SelectedIndex = selectIndex;
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kategoriler yüklenirken hata oluştu: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private async Task RefreshCategoryBadgesAsync()
        {
            if (LstSidebarCategories == null) return;

            var categories = (await _categoryRepo.GetAllAsync()).ToList();
            int? selectedId = (LstSidebarCategories.SelectedItem as SidebarCategoryItem)?.Id;

            var sidebarItems = new List<SidebarCategoryItem>
            {
                new SidebarCategoryItem { Id = null, Name = "🏠 Tüm Görevler", TaskCount = _allTasks.Count }
            };

            foreach (var cat in categories)
            {
                int count = _allTasks.Count(t => t.CategoryId == cat.Id);
                sidebarItems.Add(new SidebarCategoryItem
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    TaskCount = count,
                    Category = cat
                });
            }

            LstSidebarCategories.ItemsSource = sidebarItems;

            int selectIndex = 0;
            if (selectedId.HasValue)
            {
                for (int i = 1; i < sidebarItems.Count; i++)
                {
                    if (sidebarItems[i].Id == selectedId.Value)
                    {
                        selectIndex = i;
                        break;
                    }
                }
            }
            LstSidebarCategories.SelectedIndex = selectIndex;
        }

        private void LstSidebarCategories_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (LstSidebarCategories.SelectedItem is SidebarCategoryItem selectedItem)
            {
                TxtActiveCategoryTitle.Text = selectedItem.Id.HasValue ? selectedItem.Name : "Tüm Görevler";
                TxtActiveCategoryCount.Text = $"{selectedItem.TaskCount} görev";
                _calendarSelectedDate = null;
                ApplyFilter();
            }
        }

        private async void BtnAddCategory_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new InputDialog("Yeni görev grubu / kategori adını girin:", "Kategori Ekle") { Owner = this };
            if (dialog.ShowDialog() == true && !string.IsNullOrWhiteSpace(dialog.InputText))
            {
                var cat = new Category { Name = dialog.InputText.Trim() };
                cat.Id = await _categoryRepo.AddAsync(cat);
                await LoadCategoriesAsync();
                SetStatus($"Kategori eklendi: {cat.Name}");
            }
        }

        private async void MnuRenameCategory_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as MenuItem)?.Tag is Category cat)
            {
                var dialog = new InputDialog("Kategori için yeni ad girin:", "Yeniden Adlandır", cat.Name) { Owner = this };
                if (dialog.ShowDialog() == true && !string.IsNullOrWhiteSpace(dialog.InputText) && dialog.InputText != cat.Name)
                {
                    cat.Name = dialog.InputText.Trim();
                    await _categoryRepo.UpdateAsync(cat);
                    await LoadCategoriesAsync();
                    SetStatus($"Kategori adı güncellendi.");
                }
            }
        }

        private async void MnuAssignCategoryResource_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as MenuItem)?.Tag is Category cat)
            {
                var resources = await _resourceRepo.GetAllAsync();
                var dialog = new planlama_app.Windows.SelectResourceWindow(resources, cat.Name) { Owner = this };
                if (dialog.ShowDialog() == true)
                {
                    int? resourceId = dialog.SelectedResourceId;

                    var tasksBefore = _allTasks.Where(t => t.CategoryId == cat.Id).Select(t => new TaskItem
                    {
                        Id = t.Id, Title = t.Title, DueDate = t.DueDate, IsCompleted = t.IsCompleted,
                        TaskType = t.TaskType, ChainId = t.ChainId, OrderIndex = t.OrderIndex,
                        EstimatedTime = t.EstimatedTime, CategoryId = t.CategoryId, ResourceId = t.ResourceId
                    }).ToList();

                    int updatedCount = await _repository.AssignResourceToCategoryAsync(cat.Id, resourceId);

                    planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction
                    {
                        ActionType = planlama_app.Services.UndoActionType.BulkResourceAssign,
                        PreviousTasksState = tasksBefore
                    });

                    SetStatus(resourceId.HasValue 
                        ? $"🔗 '{cat.Name}' kategorisindeki {updatedCount} göreve kaynak bağlandı."
                        : $"🔗 '{cat.Name}' kategorisindeki görevlerin kaynak bağlantısı kaldırıldı.");

                    await LoadTasksAsync();
                }
            }
        }

        private async void MnuDeleteCategory_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as MenuItem)?.Tag is Category cat)
            {
                var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                    $"'{cat.Name}' kategorisini silmek üzeresiniz.\n\nİçindeki görevler de SİLİNSİN Mİ?\n(Hayır derseniz görevler 'Genel' kategorisine taşınır)",
                    "Kategori Sil Onayı",
                    MessageBoxButton.YesNoCancel,
                    MessageBoxImage.Question, this);

                if (confirm == planlama_app.Windows.MessageDialogWindow.DialogResultType.Cancel) return;

                if (confirm == planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes)
                {
                    var tasksToDelete = _allTasks.Where(t => t.CategoryId == cat.Id).Select(t => t.Id).ToList();
                    if (tasksToDelete.Any())
                        await _repository.DeleteMultipleAsync(tasksToDelete);
                }
                else if (confirm == planlama_app.Windows.MessageDialogWindow.DialogResultType.No)
                {
                    var genelCat = (await _categoryRepo.GetAllAsync()).FirstOrDefault(c => c.Name.Equals("Genel", StringComparison.OrdinalIgnoreCase));
                    if (genelCat == null)
                    {
                        await _categoryRepo.AddAsync(new Category { Name = "Genel" });
                        genelCat = (await _categoryRepo.GetAllAsync()).First(c => c.Name == "Genel");
                    }
                    
                    var tasksToMove = _allTasks.Where(t => t.CategoryId == cat.Id).ToList();
                    foreach(var t in tasksToMove)
                    {
                        t.CategoryId = genelCat.Id;
                        await _repository.UpdateAsync(t);
                    }
                }

                await _categoryRepo.DeleteAsync(cat.Id);
                await LoadCategoriesAsync();
                await LoadTasksAsync();
                SetStatus("Kategori silindi.");
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // NAVİGASYON HIZLI BUTONLAR
        // ═══════════════════════════════════════════════════════════════

        private void BtnToggleNavSidebar_Click(object sender, RoutedEventArgs e)
        {
            ColNavSidebar.Width = ColNavSidebar.Width.Value > 0 ? new GridLength(0) : new GridLength(240);
        }

        private async void BtnQuickAddTask_Click(object sender, RoutedEventArgs e)
        {
            int? activeCategoryId = (LstSidebarCategories.SelectedItem as SidebarCategoryItem)?.Id;
            var newTask = new TaskItem { CategoryId = activeCategoryId };

            var editWindow = new EditTaskWindow(newTask) { Owner = this };
            if (editWindow.ShowDialog() == true)
            {
                SetStatus($"✨ '{newTask.Title}' görevi başarıyla eklendi.");
                await LoadTasksAsync();
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // TAKVİM OLAYLARI VE GÖRÜNÜM MODLARI
        // ═══════════════════════════════════════════════════════════════

        private void ViewMode_Click(object sender, RoutedEventArgs e)
        {
            UpdateViewModeLayout();
        }

        private void UpdateViewModeLayout()
        {
            if (ColCalendar == null || ColSplitter == null || ColList == null) return;

            if (RbViewCalendar?.IsChecked == true)
            {
                BorderCalendar.Visibility = Visibility.Visible;
                ColCalendar.Width = new GridLength(1, GridUnitType.Star);
                
                ViewSplitter.Visibility = Visibility.Collapsed;
                ColSplitter.Width = new GridLength(0);

                GridTaskListArea.Visibility = Visibility.Collapsed;
                ColList.Width = new GridLength(0);
            }
            else if (RbViewList?.IsChecked == true)
            {
                BorderCalendar.Visibility = Visibility.Collapsed;
                ColCalendar.Width = new GridLength(0);

                ViewSplitter.Visibility = Visibility.Collapsed;
                ColSplitter.Width = new GridLength(0);

                GridTaskListArea.Visibility = Visibility.Visible;
                ColList.Width = new GridLength(1, GridUnitType.Star);
            }
            else
            {
                BorderCalendar.Visibility = Visibility.Visible;
                ColCalendar.Width = new GridLength(1.2, GridUnitType.Star);

                ViewSplitter.Visibility = Visibility.Visible;
                ColSplitter.Width = GridLength.Auto;

                GridTaskListArea.Visibility = Visibility.Visible;
                ColList.Width = new GridLength(1, GridUnitType.Star);
            }
        }

        private void CalendarControl_DateSelected(object? sender, DateTime date)
        {
            if (_calendarSelectedDate.HasValue && _calendarSelectedDate.Value.Date == date.Date)
            {
                if (_listViewGroupMode == TaskListGroupMode.Standard)
                {
                    _calendarSelectedDate = null;
                    CalendarControl.ClearSelection();
                    SetStatus("Takvim tarih filtresi kaldırıldı.");
                }
            }
            else
            {
                _calendarSelectedDate = date.Date;
                CalendarControl.SetSelectedDate(date);
                SetStatus($"📅 {date:dd MMMM yyyy} tarihi seçildi.");
            }

            ApplyFilter();
        }

        private async void CalendarControl_AddTaskRequested(object? sender, DateTime date)
        {
            int? activeCategoryId = (LstSidebarCategories.SelectedItem as SidebarCategoryItem)?.Id;
            var newTask = new TaskItem
            {
                DueDate = date,
                CategoryId = activeCategoryId
            };

            var editWindow = new EditTaskWindow(newTask) { Owner = this };
            if (editWindow.ShowDialog() == true)
            {
                SetStatus($"✨ '{newTask.Title}' görevi {date:dd.MM.yyyy} tarihine eklendi.");
                await LoadTasksAsync();
            }
        }

        private void CalendarControl_TaskClicked(object? sender, TaskItem task)
        {
            if (task.DueDate.HasValue)
            {
                _calendarSelectedDate = task.DueDate.Value.Date;
                CalendarControl.SetSelectedDate(_calendarSelectedDate);
                SetStatus($"📅 {task.DueDate.Value:dd MMMM yyyy} tarihli görevler filtrelendi.");
                ApplyFilter();
            }
        }

        private void ListGroupMode_Click(object sender, RoutedEventArgs e)
        {
            if (RbGroupDaily?.IsChecked == true)
            {
                _listViewGroupMode = TaskListGroupMode.Daily;
                if (!_calendarSelectedDate.HasValue) _calendarSelectedDate = DateTime.Today;
                CalendarControl.SetSelectedDate(_calendarSelectedDate);
                GroupExpandedConverter.CurrentMode = TaskListGroupMode.Daily;
            }
            else if (RbGroupWeekly?.IsChecked == true)
            {
                _listViewGroupMode = TaskListGroupMode.Weekly;
                if (!_calendarSelectedDate.HasValue) _calendarSelectedDate = DateTime.Today;
                CalendarControl.SetSelectedDate(_calendarSelectedDate);
                GroupExpandedConverter.CurrentMode = TaskListGroupMode.Weekly;
            }
            else
            {
                _listViewGroupMode = TaskListGroupMode.Standard;
                _calendarSelectedDate = null;
                CalendarControl.ClearSelection();
                GroupExpandedConverter.CurrentMode = TaskListGroupMode.Standard;
            }

            ApplyFilter();
        }

        private void BtnClearDateFilter_Click(object sender, RoutedEventArgs e)
        {
            _calendarSelectedDate = null;
            CalendarControl.ClearSelection();
            if (RbGroupStandard != null) RbGroupStandard.IsChecked = true;
            _listViewGroupMode = TaskListGroupMode.Standard;
            GroupExpandedConverter.CurrentMode = TaskListGroupMode.Standard;
            SetStatus("Tarih filtresi kaldırıldı.");
            ApplyFilter();
        }

        // ═══════════════════════════════════════════════════════════════
        // FİLTRELEME & SORGULAMA
        // ═══════════════════════════════════════════════════════════════

        private void TxtSearch_TextChanged(object sender, TextChangedEventArgs e) => ApplyFilter();
        private void CmbFilter_SelectionChanged(object sender, SelectionChangedEventArgs e) => ApplyFilter();
        private void Filter_Changed(object sender, RoutedEventArgs e) => ApplyFilter();

        private void ApplyFilter()
        {
            if (LvTasks == null || TxtSearch == null || CmbFilter == null || 
                ChkHideCompleted == null || PanelEmpty == null || CalendarControl == null)
                return;

            int? categoryIdFilter = (LstSidebarCategories?.SelectedItem as SidebarCategoryItem)?.Id;

            CalendarControl.SetTasks(_allTasks, categoryIdFilter);
            GroupExpandedConverter.CurrentMode = _listViewGroupMode;

            var filtered = _allTasks.AsEnumerable();

            if (!string.IsNullOrEmpty(TxtSearch?.Text?.Trim()))
            {
                string search = TxtSearch.Text.Trim();
                filtered = filtered.Where(t =>
                    t.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    (t.ChainId?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false));
            }

            int typeIndex = CmbFilter?.SelectedIndex ?? 0;
            filtered = typeIndex switch
            {
                1 => filtered.Where(t => t.TaskType == TaskType.Bağımsız),
                2 => filtered.Where(t => t.TaskType == TaskType.Zincirleme),
                _ => filtered
            };

            if (categoryIdFilter.HasValue)
            {
                filtered = filtered.Where(t => t.CategoryId == categoryIdFilter.Value);
            }

            if (ChkHideCompleted?.IsChecked == true)
                filtered = filtered.Where(t => !t.IsCompleted);

            List<TaskItem> list;
            string groupProperty;

            if (_listViewGroupMode == TaskListGroupMode.Daily)
            {
                DateTime targetDate = _calendarSelectedDate ?? DateTime.Today;
                filtered = filtered.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == targetDate.Date);

                if (BorderDateFilterBadge != null) BorderDateFilterBadge.Visibility = Visibility.Visible;
                if (TxtSelectedDateFilter != null) TxtSelectedDateFilter.Text = $"{targetDate:dd MMMM yyyy}";
                if (TxtListHeaderTitle != null) TxtListHeaderTitle.Text = "Günlük Görünüm";

                groupProperty = nameof(TaskItem.ExactDateGroup);
                list = filtered
                    .OrderBy(t => t.TaskType)
                    .ThenBy(t => t.ChainId)
                    .ThenBy(t => t.OrderIndex)
                    .ThenBy(t => t.DueDate)
                    .ToList();
            }
            else if (_listViewGroupMode == TaskListGroupMode.Weekly)
            {
                DateTime targetDate = _calendarSelectedDate ?? DateTime.Today;
                int diff = (7 + (targetDate.DayOfWeek - DayOfWeek.Monday)) % 7;
                var startOfWeek = targetDate.AddDays(-diff).Date;
                var endOfWeek = startOfWeek.AddDays(6).Date;

                filtered = filtered.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date >= startOfWeek && t.DueDate.Value.Date <= endOfWeek);

                if (BorderDateFilterBadge != null) BorderDateFilterBadge.Visibility = Visibility.Visible;
                if (TxtSelectedDateFilter != null) TxtSelectedDateFilter.Text = $"{startOfWeek:dd MMM} - {endOfWeek:dd MMM yyyy}";
                if (TxtListHeaderTitle != null) TxtListHeaderTitle.Text = "Haftalık Görünüm";

                groupProperty = nameof(TaskItem.DayGroup);
                list = filtered
                    .OrderBy(t => t.DayGroupOrder)
                    .ThenBy(t => t.TaskType)
                    .ThenBy(t => t.ChainId)
                    .ThenBy(t => t.OrderIndex)
                    .ThenBy(t => t.DueDate)
                    .ToList();
            }
            else // Standard / Varsayılan
            {
                if (_calendarSelectedDate.HasValue)
                {
                    filtered = filtered.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == _calendarSelectedDate.Value.Date);

                    if (BorderDateFilterBadge != null) BorderDateFilterBadge.Visibility = Visibility.Visible;
                    if (TxtSelectedDateFilter != null) TxtSelectedDateFilter.Text = $"{_calendarSelectedDate.Value:dd MMMM yyyy}";
                    if (TxtListHeaderTitle != null) TxtListHeaderTitle.Text = "Seçili Tarih Görevleri";

                    groupProperty = nameof(TaskItem.ExactDateGroup);
                    list = filtered
                        .OrderBy(t => t.TaskType)
                        .ThenBy(t => t.ChainId)
                        .ThenBy(t => t.OrderIndex)
                        .ThenBy(t => t.DueDate)
                        .ToList();
                }
                else
                {
                    if (BorderDateFilterBadge != null) BorderDateFilterBadge.Visibility = Visibility.Collapsed;
                    if (TxtListHeaderTitle != null) TxtListHeaderTitle.Text = "Görev Listesi";

                    groupProperty = nameof(TaskItem.DateGroup);
                    list = filtered
                        .OrderBy(t => t.DateGroupOrder)
                        .ThenBy(t => t.TaskType)
                        .ThenBy(t => t.ChainId)
                        .ThenBy(t => t.OrderIndex)
                        .ThenBy(t => t.DueDate)
                        .ToList();
                }
            }

            var collectionView = CollectionViewSource.GetDefaultView(list);
            if (collectionView != null)
            {
                collectionView.GroupDescriptions.Clear();
                collectionView.GroupDescriptions.Add(new PropertyGroupDescription(groupProperty));
            }

            LvTasks.ItemsSource = collectionView;
            TxtActiveCategoryCount.Text = $"{list.Count} görev";
            PanelEmpty.Visibility = list.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            LvTasks.Visibility = list.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
        }

        // ═══════════════════════════════════════════════════════════════
        // DİĞER ETKİLEŞİMLER, GERİ AL (UNDO) & İLERİ AL (REDO)
        // ═══════════════════════════════════════════════════════════════

        private async void ChkCompleted_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as CheckBox)?.DataContext is TaskItem task)
            {
                try
                {
                    await _repository.UpdateAsync(task);
                    SetStatus($"Görevin durumu güncellendi: {task.Title}");
                    await RefreshCategoryBadgesAsync();
                    CalendarControl.SetTasks(_allTasks, (LstSidebarCategories?.SelectedItem as SidebarCategoryItem)?.Id);
                }
                catch (Exception ex)
                {
                    planlama_app.Windows.MessageDialogWindow.Show(ex.Message, "Güncelleme Hatası", MessageBoxButton.OK, MessageBoxImage.Error, this);
                }
            }
        }

        private async void BtnPostpone_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            try
            {
                int updated;
                if (task.TaskType == TaskType.Zincirleme)
                {
                    updated = await _repository.PostponeChainTaskCascadeAsync(task.Id);
                    SetStatus(updated > 0 ? $"⛓ '{task.Title}' ve zincirin {updated} görevi 1 gün ertelendi." : $"⚠ Erteleme yapılamadı.");
                }
                else
                {
                    updated = await _repository.PostponeIndependentTaskAsync(task.Id);
                    SetStatus(updated > 0 ? $"📅 '{task.Title}' 1 gün ertelendi." : "⚠ Görev bulunamadı.");
                }

                if (updated > 0) await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show(ex.Message, "Erteleme Hatası", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private async void BtnEdit_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            var editWindow = new EditTaskWindow(task) { Owner = this };
            if (editWindow.ShowDialog() == true)
            {
                SetStatus($"📝 '{task.Title}' başarıyla güncellendi.");
                await LoadTasksAsync();
            }
        }

        private async void BtnDelete_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                $"'{task.Title}' görevini silmek istediğinize emin misiniz?",
                "Görevi Sil", MessageBoxButton.YesNo, MessageBoxImage.Question, this);

            if (confirm != planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes) return;

            try
            {
                int result = await _repository.DeleteAsync(task.Id);
                if (result > 0)
                {
                    planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction { ActionType = planlama_app.Services.UndoActionType.Delete, Task = task });
                    SetStatus($"🗑 '{task.Title}' silindi.");
                    await LoadTasksAsync();
                }
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Silme hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private async void BtnDeleteSelected_Click(object sender, RoutedEventArgs e)
        {
            var selectedTasks = _allTasks.Where(t => t.IsSelected).ToList();
            if (!selectedTasks.Any()) return;

            var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                $"{selectedTasks.Count} adet görevi silmek istediğinize emin misiniz?",
                "Seçilenleri Sil", MessageBoxButton.YesNo, MessageBoxImage.Warning, this);

            if (confirm != planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes) return;

            SetLoading(true, "Seçili görevler siliniyor...");
            try
            {
                var ids = selectedTasks.Select(t => t.Id);
                int deletedCount = await _repository.DeleteMultipleAsync(ids);
                planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction { ActionType = planlama_app.Services.UndoActionType.BulkDelete, Tasks = selectedTasks });
                SetStatus($"🗑 {deletedCount} görev toplu silindi.");
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Toplu silme hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
            }
        }

        private void ChkSelectGroup_Checked(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox chk && chk.Tag is string groupName)
            {
                var view = CollectionViewSource.GetDefaultView(LvTasks.ItemsSource);
                if (view?.Groups != null)
                {
                    foreach (CollectionViewGroup group in view.Groups)
                    {
                        if (group.Name?.ToString() == groupName)
                        {
                            foreach (var item in group.Items)
                            {
                                if (item is TaskItem task) task.IsSelected = true;
                            }
                            break;
                        }
                    }
                }
                UpdateDeleteSelectedButtonState();
            }
        }

        private void ChkSelectGroup_Unchecked(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox chk && chk.Tag is string groupName)
            {
                var view = CollectionViewSource.GetDefaultView(LvTasks.ItemsSource);
                if (view?.Groups != null)
                {
                    foreach (CollectionViewGroup group in view.Groups)
                    {
                        if (group.Name?.ToString() == groupName)
                        {
                            foreach (var item in group.Items)
                            {
                                if (item is TaskItem task) task.IsSelected = false;
                            }
                            break;
                        }
                    }
                }
                UpdateDeleteSelectedButtonState();
            }
        }

        private void ChkItem_Changed(object sender, RoutedEventArgs e) => UpdateDeleteSelectedButtonState();

        private async void BtnUndo_Click(object sender, RoutedEventArgs e)
        {
            if (!planlama_app.Services.UndoManager.CanUndo) return;
            var action = planlama_app.Services.UndoManager.PopAction();
            if (action == null) return;

            SetLoading(true);
            try
            {
                if (action.ActionType == planlama_app.Services.UndoActionType.Add)
                {
                    await _repository.DeleteAsync(action.Task!.Id);
                    SetStatus($"↩ Görev ekleme geri alındı: '{action.Task.Title}'");
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.Delete)
                {
                    await _repository.RestoreAsync(action.Task!);
                    SetStatus($"↩ Görev silme geri alındı: '{action.Task!.Title}'");
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.BulkDelete)
                {
                    await _repository.RestoreMultipleAsync(action.Tasks!);
                    SetStatus($"↩ Toplu silme geri alındı ({action.Tasks!.Count} görev)");
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.Update)
                {
                    await _repository.UpdateAsync(action.PreviousState!);
                    SetStatus($"↩ Görev güncellemesi geri alındı: '{action.PreviousState!.Title}'");
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.AddResource)
                {
                    if (action.Resource != null)
                    {
                        await _resourceRepo.DeleteAsync(action.Resource.Id);
                        SetStatus($"↩ Kaynak ekleme geri alındı: '{action.Resource.Title}'");
                    }
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.DeleteResource)
                {
                    if (action.Resource != null)
                    {
                        await _resourceRepo.RestoreAsync(action.Resource);
                        SetStatus($"↩ Kaynak silme geri alındı: '{action.Resource.Title}'");
                    }
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.BulkResourceAssign)
                {
                    if (action.PreviousTasksState != null)
                    {
                        foreach (var prevTask in action.PreviousTasksState)
                        {
                            await _repository.UpdateAsync(prevTask);
                        }
                        SetStatus($"↩ Sekme kaynak bağlama işlemi geri alındı ({action.PreviousTasksState.Count} görev).");
                    }
                }
                
                await LoadResourcesAsync();
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Geri alma hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
                if (BtnUndo != null) BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;
                if (BtnRedo != null) BtnRedo.IsEnabled = planlama_app.Services.UndoManager.CanRedo;
            }
        }

        private async void BtnRedo_Click(object sender, RoutedEventArgs e)
        {
            if (!planlama_app.Services.UndoManager.CanRedo) return;
            var action = planlama_app.Services.UndoManager.PopRedo();
            if (action == null) return;

            SetLoading(true);
            try
            {
                if (action.ActionType == UndoActionType.Add)
                {
                    await _repository.RestoreAsync(action.Task!);
                    SetStatus($"↪ Görev ekleme işlemi yeniden uygulandı: '{action.Task!.Title}'");
                }
                else if (action.ActionType == UndoActionType.Delete)
                {
                    await _repository.DeleteAsync(action.Task!.Id);
                    SetStatus($"↪ Görev silme işlemi yeniden uygulandı: '{action.Task!.Title}'");
                }
                else if (action.ActionType == UndoActionType.BulkDelete)
                {
                    var ids = action.Tasks!.Select(t => t.Id);
                    await _repository.DeleteMultipleAsync(ids);
                    SetStatus($"↪ Toplu silme işlemi yeniden uygulandı ({action.Tasks!.Count} görev)");
                }
                else if (action.ActionType == UndoActionType.Update)
                {
                    await _repository.UpdateAsync(action.Task!);
                    SetStatus($"↪ Görev güncellemesi yeniden uygulandı: '{action.Task!.Title}'");
                }
                else if (action.ActionType == UndoActionType.AddResource)
                {
                    if (action.Resource != null)
                    {
                        await _resourceRepo.RestoreAsync(action.Resource);
                        SetStatus($"↪ Kaynak ekleme yeniden uygulandı: '{action.Resource.Title}'");
                    }
                }
                else if (action.ActionType == UndoActionType.DeleteResource)
                {
                    if (action.Resource != null)
                    {
                        await _resourceRepo.DeleteAsync(action.Resource.Id);
                        SetStatus($"↪ Kaynak silme yeniden uygulandı: '{action.Resource.Title}'");
                    }
                }

                await LoadResourcesAsync();
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"İleri alma hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
                if (BtnUndo != null) BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;
                if (BtnRedo != null) BtnRedo.IsEnabled = planlama_app.Services.UndoManager.CanRedo;
            }
        }

        private async Task LoadResourcesAsync()
        {
            try
            {
                var resources = await _resourceRepo.GetAllAsync();
                LvResources.ItemsSource = resources;
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kaynaklar yükleme hatası: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private void BtnToggleSidebar_Click(object sender, RoutedEventArgs e) => SidebarBorder.Visibility = SidebarBorder.Visibility == Visibility.Visible ? Visibility.Collapsed : Visibility.Visible;
        private void BtnCloseSidebar_Click(object sender, RoutedEventArgs e) => SidebarBorder.Visibility = Visibility.Collapsed;

        private async void BtnAddResource_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new InputDialog("Kaynak başlığı ve URL/içeriğini girin (örn: 'Doküman | http://link')", "Yeni Kaynak") { Owner = this };
            if (dialog.ShowDialog() == true && !string.IsNullOrWhiteSpace(dialog.InputText))
            {
                var parts = dialog.InputText.Split('|');
                var res = new ResourceItem
                {
                    Title = parts[0].Trim(),
                    Url = parts.Length > 1 ? parts[1].Trim() : string.Empty
                };

                res.Id = await _resourceRepo.AddAsync(res);
                planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction
                {
                    ActionType = planlama_app.Services.UndoActionType.AddResource,
                    Resource = res
                });

                SetStatus($"🔖 Yeni kaynak eklendi: '{res.Title}'");
                await LoadResourcesAsync();
            }
        }

        private async void MnuDeleteResource_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as MenuItem)?.Tag is ResourceItem resource)
            {
                var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                    $"'{resource.Title}' kaynağını silmek istediğinize emin misiniz?",
                    "Kaynağı Sil", MessageBoxButton.YesNo, MessageBoxImage.Question, this);

                if (confirm != planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes) return;

                await _resourceRepo.DeleteAsync(resource.Id);
                planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction
                {
                    ActionType = planlama_app.Services.UndoActionType.DeleteResource,
                    Resource = resource
                });

                SetStatus($"🗑 '{resource.Title}' kaynağı silindi (Ctrl+Z ile geri alınabilir).");
                await LoadResourcesAsync();
                await LoadTasksAsync();
            }
        }

        private async void BtnImport_Click(object sender, RoutedEventArgs e)
        {
            int? defaultCategoryId = (LstSidebarCategories.SelectedItem as SidebarCategoryItem)?.Id;
            var categories = await _categoryRepo.GetAllAsync();
            var selectWindow = new planlama_app.Windows.SelectCategoryWindow(categories, defaultCategoryId) { Owner = this };

            if (selectWindow.ShowDialog() != true) return;
            int? targetCategoryId = selectWindow.SelectedCategoryId;

            var dialog = new OpenFileDialog
            {
                InitialDirectory = AppDomain.CurrentDomain.BaseDirectory,
                Title = "İçe Aktarılacak Dosyayı Seç",
                Filter = "Metin Dosyaları (*.txt)|*.txt|Tüm Dosyalar (*.*)|*.*",
                RestoreDirectory = true
            };

            if (dialog.ShowDialog() != true) return;

            SetLoading(true, $"'{System.IO.Path.GetFileName(dialog.FileName)}' içe aktarılıyor...");
            try
            {
                var result = await _importService.ImportFromTxtAsync(dialog.FileName, targetCategoryId);
                string detail = result.SkippedCount > 0 ? $"\n\nAtlanan satırlar:\n{string.Join("\n", result.Errors)}" : string.Empty;

                planlama_app.Windows.MessageDialogWindow.Show(
                    $"✅ İçe Aktarma Tamamlandı!\n\n" +
                    $"Aktarıldı : {result.SuccessCount} görev\n" +
                    $"Atlandı   : {result.SkippedCount} satır{detail}",
                    "İçe Aktarma Sonucu", MessageBoxButton.OK,
                    result.SkippedCount > 0 ? MessageBoxImage.Warning : MessageBoxImage.Information, this);

                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"İçe aktarma hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
            }
        }

        private void BtnTemplate_Click(object sender, RoutedEventArgs e)
        {
            string templatePath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "sablon_gorevler.txt");
            string templateContent = """
                # ==============================================================================
                # GÖREV PLANI İÇE AKTARMA ŞABLONU (TaskList AI / LLM)
                # ==============================================================================
                # Format Yapısı: [Tarih (yyyy-MM-dd)] | [Tip (B veya Z)] | [ChainId] | [Sıra] | [Süre (dk)] | [Görev Başlığı]
                #
                | B | | 0 | | Faturaları öde ve makbuzları arşivle
                2026-07-20 | B | | 0 | 120 | Haftalık genel ev temizliğini yap
                2026-07-15 | Z | ROMENCE_KURS | 1 | 45 | Harfleri ve telaffuz kurallarını öğren
                2026-07-16 | Z | ROMENCE_KURS | 2 | 45 | Günlük hayatta sık kullanılan 50 kelimeyi ezberle
                """;

            try
            {
                if (!System.IO.File.Exists(templatePath))
                {
                    System.IO.File.WriteAllText(templatePath, templateContent, System.Text.Encoding.UTF8);
                }
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = templatePath,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Şablon açma hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if ((System.Windows.Input.Keyboard.Modifiers & System.Windows.Input.ModifierKeys.Control) == System.Windows.Input.ModifierKeys.Control)
            {
                if (e.Key == System.Windows.Input.Key.Z)
                {
                    if (BtnUndo != null && BtnUndo.IsEnabled) BtnUndo_Click(this, new RoutedEventArgs());
                }
                else if (e.Key == System.Windows.Input.Key.Y)
                {
                    if (BtnRedo != null && BtnRedo.IsEnabled) BtnRedo_Click(this, new RoutedEventArgs());
                }
            }
        }

        private void UpdateDeleteSelectedButtonState()
        {
            int selectedCount = _allTasks.Count(t => t.IsSelected);
            if (BorderSelectionBar != null && TxtSelectedCount != null)
            {
                BorderSelectionBar.Visibility = selectedCount > 0 ? Visibility.Visible : Visibility.Collapsed;
                TxtSelectedCount.Text = $"{selectedCount} görev seçildi";
            }
        }

        private void SetLoading(bool isLoading, string? message = null)
        {
            if (LoadingSpinner != null) LoadingSpinner.Visibility = isLoading ? Visibility.Visible : Visibility.Collapsed;
            if (message is not null && TxtStatus != null) TxtStatus.Text = message;
        }

        private void SetStatus(string message)
        {
            if (TxtStatus != null) TxtStatus.Text = message;
        }
    }

    public enum TaskListGroupMode
    {
        Standard,
        Daily,
        Weekly
    }
}