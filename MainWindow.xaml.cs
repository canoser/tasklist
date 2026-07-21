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

namespace planlama_app
{
    /// <summary>
    /// MainWindow code-behind: TaskRepository ve ImportService'i bağlar.
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

        // ---------------------------------------------------------------
        // Yapıcı
        // ---------------------------------------------------------------
        public MainWindow()
        {
            InitializeComponent();
            _importService = new ImportService(_repository);

            string savedTheme = planlama_app.Themes.ThemeManager.LoadTheme();
            foreach (System.Windows.Controls.ComboBoxItem item in CmbTheme.Items)
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
                await LoadCategoriesAsync();
                await LoadTasksAsync();
                await LoadResourcesAsync();
                UpdateViewModeLayout();
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // TEMA YÖNETİMİ
        // ═══════════════════════════════════════════════════════════════

        private void CmbTheme_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CmbTheme?.SelectedItem is ComboBoxItem item && item.Content != null)
            {
                string themeName = item.Content.ToString()!;
                planlama_app.Themes.ThemeManager.ApplyTheme(themeName);
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // VERİ YÜKLEME
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Veritabanından tüm görevleri çekip ListView ve Takvime bağlar.
        /// </summary>
        private async Task LoadTasksAsync()
        {
            SetLoading(true, "Görevler yükleniyor...");
            try
            {
                _allTasks = (await _repository.GetAllTasksAsync()).ToList();

                BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;

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
        // KATEGORİ SEKMELERİ (Görev Grupları)
        // ═══════════════════════════════════════════════════════════════

        private async Task LoadCategoriesAsync()
        {
            try
            {
                var categories = await _categoryRepo.GetAllAsync();
                int? currentlySelectedId = (TabCategories.SelectedItem as TabItem)?.Tag as int?;

                TabCategories.Items.Clear();

                // "Tümü" Sekmesi
                int totalCount = _allTasks.Count;
                var tabAll = new TabItem { Header = $"Tümü ({totalCount})", Tag = null };
                TabCategories.Items.Add(tabAll);

                // Dinamik Sekmeler
                foreach (var cat in categories)
                {
                    int catCount = _allTasks.Count(t => t.CategoryId == cat.Id);
                    AddDynamicTab(cat, catCount);
                }

                // Seçili sekmeyi koru
                int selectIndex = 0;
                if (currentlySelectedId.HasValue)
                {
                    for (int i = 1; i < TabCategories.Items.Count; i++)
                    {
                        if ((TabCategories.Items[i] as TabItem)?.Tag as int? == currentlySelectedId.Value)
                        {
                            selectIndex = i;
                            break;
                        }
                    }
                }
                TabCategories.SelectedIndex = selectIndex;
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kategoriler yüklenirken hata oluştu: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private async Task RefreshCategoryBadgesAsync()
        {
            if (TabCategories == null) return;

            var categories = (await _categoryRepo.GetAllAsync()).ToList();

            if (TabCategories.Items.Count > 0 && TabCategories.Items[0] is TabItem tabAll)
            {
                tabAll.Header = $"Tümü ({_allTasks.Count})";
            }

            for (int i = 0; i < categories.Count; i++)
            {
                int tabIdx = i + 1;
                if (tabIdx < TabCategories.Items.Count && TabCategories.Items[tabIdx] is TabItem tab)
                {
                    var cat = categories[i];
                    int count = _allTasks.Count(t => t.CategoryId == cat.Id);
                    tab.Header = count > 0 ? $"{cat.Name} ({count})" : cat.Name;
                }
            }
        }

        private void AddDynamicTab(Category category, int taskCount)
        {
            string headerText = taskCount > 0 ? $"{category.Name} ({taskCount})" : category.Name;
            var tab = new TabItem { Header = headerText, Tag = category.Id };
            
            // Sağ Tık Menüsü (ContextMenu)
            var menu = new ContextMenu();
            var mnuRename = new MenuItem { Header = "Yeniden Adlandır", Tag = category };
            mnuRename.Click += MnuRenameCategory_Click;
            
            var mnuDelete = new MenuItem { Header = "Sil", Tag = category, Foreground = System.Windows.Media.Brushes.Red };
            mnuDelete.Click += MnuDeleteCategory_Click;

            menu.Items.Add(mnuRename);
            menu.Items.Add(mnuDelete);

            tab.ContextMenu = menu;
            TabCategories.Items.Add(tab);
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
                SetStatus("Kategori işlemi tamamlandı.");
            }
        }

        private void TabCategories_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (e.OriginalSource == TabCategories)
            {
                _calendarSelectedDate = null; // Sekme değiştiğinde takvim tarih filtresini sıfırla
                ApplyFilter();
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
                // Sadece Takvim
                BorderCalendar.Visibility = Visibility.Visible;
                ColCalendar.Width = new GridLength(1, GridUnitType.Star);
                
                ViewSplitter.Visibility = Visibility.Collapsed;
                ColSplitter.Width = new GridLength(0);

                GridTaskListArea.Visibility = Visibility.Collapsed;
                ColList.Width = new GridLength(0);
            }
            else if (RbViewList?.IsChecked == true)
            {
                // Sadece Liste
                BorderCalendar.Visibility = Visibility.Collapsed;
                ColCalendar.Width = new GridLength(0);

                ViewSplitter.Visibility = Visibility.Collapsed;
                ColSplitter.Width = new GridLength(0);

                GridTaskListArea.Visibility = Visibility.Visible;
                ColList.Width = new GridLength(1, GridUnitType.Star);
            }
            else
            {
                // Bölünmüş Görünüm (Split)
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
                _calendarSelectedDate = null;
                SetStatus("Takvim tarih filtresi kaldırıldı.");
            }
            else
            {
                _calendarSelectedDate = date.Date;
                SetStatus($"📅 {date:dd MMMM yyyy} tarihli görevler filtrelendi.");
            }

            ApplyFilter();
        }

        private async void CalendarControl_AddTaskRequested(object? sender, DateTime date)
        {
            var newTask = new TaskItem
            {
                DueDate = date,
                CategoryId = (TabCategories.SelectedItem as TabItem)?.Tag as int?
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
            BtnEdit_Click(new Button { Tag = task }, new RoutedEventArgs());
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
                ChkHideCompleted == null || TxtCount == null || PanelEmpty == null || CalendarControl == null)
                return;

            int? categoryIdFilter = (TabCategories?.SelectedItem as TabItem)?.Tag as int?;

            // Takvimi Güncelle
            CalendarControl.SetTasks(_allTasks, categoryIdFilter);

            var filtered = _allTasks.AsEnumerable();

            // 1) Metin araması
            string search = TxtSearch?.Text?.Trim() ?? string.Empty;
            if (!string.IsNullOrEmpty(search))
                filtered = filtered.Where(t =>
                    t.Title.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    (t.ChainId?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false));

            // 2) Tür filtresi
            int typeIndex = CmbFilter?.SelectedIndex ?? 0;
            filtered = typeIndex switch
            {
                1 => filtered.Where(t => t.TaskType == TaskType.Bağımsız),
                2 => filtered.Where(t => t.TaskType == TaskType.Zincirleme),
                _ => filtered
            };

            // 3) Kategori filtresi
            if (categoryIdFilter.HasValue)
            {
                filtered = filtered.Where(t => t.CategoryId == categoryIdFilter.Value);
            }

            // 4) Takvim Tarih filtresi (Eğer takvimden bir gün seçildiyse)
            if (_calendarSelectedDate.HasValue)
            {
                filtered = filtered.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == _calendarSelectedDate.Value.Date);
            }

            // 5) Tamamlananları gizle
            if (ChkHideCompleted?.IsChecked == true)
                filtered = filtered.Where(t => !t.IsCompleted);

            // Sıralama
            var list = filtered
                .OrderBy(t => t.DateGroupOrder)
                .ThenBy(t => t.TaskType)
                .ThenBy(t => t.ChainId)
                .ThenBy(t => t.OrderIndex)
                .ThenBy(t => t.DueDate)
                .ToList();

            // Gruplama
            var collectionView = CollectionViewSource.GetDefaultView(list);
            if (collectionView != null)
            {
                collectionView.GroupDescriptions.Clear();
                collectionView.GroupDescriptions.Add(new PropertyGroupDescription(nameof(TaskItem.DateGroup)));
            }

            LvTasks.ItemsSource = collectionView;
            TxtCount.Text = $"{list.Count} görev";
            PanelEmpty.Visibility = list.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            LvTasks.Visibility = list.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
        }

        // ═══════════════════════════════════════════════════════════════
        // DİĞER ETKİLEŞİMLER
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
                    CalendarControl.SetTasks(_allTasks, (TabCategories?.SelectedItem as TabItem)?.Tag as int?);
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
                    SetStatus(updated > 0
                        ? $"⛓ '{task.Title}' ve zincirin {updated} görevi 1 gün ertelendi."
                        : $"⚠ Zincir görevi ertelemek için ChainId gerekli.");
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
                    await _repository.DeleteAsync(action.Task.Id);
                else if (action.ActionType == planlama_app.Services.UndoActionType.Delete)
                    await _repository.RestoreAsync(action.Task);
                else if (action.ActionType == planlama_app.Services.UndoActionType.BulkDelete)
                    await _repository.RestoreMultipleAsync(action.Tasks);
                else if (action.ActionType == planlama_app.Services.UndoActionType.Update)
                    await _repository.UpdateAsync(action.PreviousState);
                
                SetStatus("Geri alma işlemi uygulandı.");
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Geri alma hatası:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
                BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;
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

                await _resourceRepo.AddAsync(res);
                await LoadResourcesAsync();
            }
        }

        private async void BtnImport_Click(object sender, RoutedEventArgs e)
        {
            int? defaultCategoryId = (TabCategories.SelectedItem as TabItem)?.Tag as int?;
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

        private async void BtnRefresh_Click(object sender, RoutedEventArgs e) => await LoadTasksAsync();

        private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == System.Windows.Input.Key.Z && (System.Windows.Input.Keyboard.Modifiers & System.Windows.Input.ModifierKeys.Control) == System.Windows.Input.ModifierKeys.Control)
            {
                if (BtnUndo.IsEnabled) BtnUndo_Click(this, new RoutedEventArgs());
            }
        }

        private void UpdateDeleteSelectedButtonState()
        {
            if (BtnDeleteSelected == null) return;
            BtnDeleteSelected.IsEnabled = _allTasks.Any(t => t.IsSelected);
        }

        private void SetLoading(bool isLoading, string? message = null)
        {
            if (LoadingSpinner != null) LoadingSpinner.Visibility = isLoading ? Visibility.Visible : Visibility.Collapsed;
            if (BtnImport != null) BtnImport.IsEnabled = !isLoading;
            if (BtnRefresh != null) BtnRefresh.IsEnabled = !isLoading;
            if (message is not null && TxtStatus != null) TxtStatus.Text = message;
        }

        private void SetStatus(string message)
        {
            if (TxtStatus != null) TxtStatus.Text = message;
        }
    }
}