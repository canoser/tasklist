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
        private readonly ImportService  _importService;

        // ---------------------------------------------------------------
        // Durum (State)
        // ---------------------------------------------------------------
        private List<TaskItem> _allTasks = new();

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

            // Pencere açılışında kategorileri, görevleri ve kaynakları yükle
            Loaded += async (_, _) => 
            {
                await LoadCategoriesAsync();
                await LoadTasksAsync();
                await LoadResourcesAsync();
            };
        }

        // ═══════════════════════════════════════════════════════════════
        // VERİ YÜKLEME
        // ═══════════════════════════════════════════════════════════════

        /// <summary>
        /// Veritabanından tüm görevleri çekip ListView'a bağlar.
        /// </summary>
        private async Task LoadTasksAsync()
        {
            SetLoading(true, "Görevler yükleniyor...");
            try
            {
                const string sql = "SELECT * FROM Tasks ORDER BY TaskType, ChainId, OrderIndex, DueDate;";
                using var conn = DatabaseHelper.GetConnection();
                _allTasks = (await _repository.GetAllTasksAsync()).ToList();

                BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;

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
        // KATEGORİ SEKMELERİ
        // ═══════════════════════════════════════════════════════════════

        private async Task LoadCategoriesAsync()
        {
            try
            {
                var categories = await _categoryRepo.GetAllAsync();
                TabCategories.Items.Clear();

                // "Tümü" Sekmesi
                var tabAll = new TabItem { Header = "Tümü", Tag = null };
                TabCategories.Items.Add(tabAll);

                // Dinamik Sekmeler
                foreach (var cat in categories)
                {
                    AddDynamicTab(cat);
                }

                TabCategories.SelectedIndex = 0;
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kategoriler yüklenirken hata oluştu: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private void AddDynamicTab(Category category)
        {
            var tab = new TabItem { Header = category.Name, Tag = category.Id };
            
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
            var dialog = new InputDialog("Yeni kategori adını girin:", "Kategori Ekle") { Owner = this };
            if (dialog.ShowDialog() == true && !string.IsNullOrWhiteSpace(dialog.InputText))
            {
                var cat = new Category { Name = dialog.InputText.Trim() };
                cat.Id = await _categoryRepo.AddAsync(cat);
                AddDynamicTab(cat);
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
                    await LoadCategoriesAsync(); // Sekmeleri yenile
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
                    // Tümü silinsin
                    var tasksToDelete = _allTasks.Where(t => t.CategoryId == cat.Id).Select(t => t.Id).ToList();
                    if (tasksToDelete.Any())
                        await _repository.DeleteMultipleAsync(tasksToDelete);
                }
                else if (confirm == planlama_app.Windows.MessageDialogWindow.DialogResultType.No)
                {
                    // Genel'e taşınsın
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
                ApplyFilter();
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // KAYNAKLAR (SIDEBAR)
        // ═══════════════════════════════════════════════════════════════

        private async Task LoadResourcesAsync()
        {
            try
            {
                var resources = await _resourceRepo.GetAllAsync();
                LvResources.ItemsSource = resources;
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Kaynaklar yüklenirken hata oluştu: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        private void BtnToggleSidebar_Click(object sender, RoutedEventArgs e)
        {
            SidebarBorder.Visibility = SidebarBorder.Visibility == Visibility.Visible ? Visibility.Collapsed : Visibility.Visible;
        }

        private void BtnCloseSidebar_Click(object sender, RoutedEventArgs e)
        {
            SidebarBorder.Visibility = Visibility.Collapsed;
        }

        private async void BtnAddResource_Click(object sender, RoutedEventArgs e)
        {
            var titleDialog = new InputDialog("Kaynak başlığını girin:", "Yeni Kaynak") { Owner = this };
            if (titleDialog.ShowDialog() != true || string.IsNullOrWhiteSpace(titleDialog.InputText)) return;

            var urlDialog = new InputDialog("Kaynağın URL/Link adresini girin:", "Yeni Kaynak") { Owner = this };
            if (urlDialog.ShowDialog() != true || string.IsNullOrWhiteSpace(urlDialog.InputText)) return;

            string url = urlDialog.InputText.Trim();
            if (!url.StartsWith("http")) url = "https://" + url;

            var platform = PlatformType.Web;
            if (url.Contains("youtube.com") || url.Contains("youtu.be")) platform = PlatformType.YouTube;
            else if (url.Contains("udemy.com")) platform = PlatformType.Udemy;
            else if (url.Contains("github.com")) platform = PlatformType.GitHub;

            var item = new ResourceItem
            {
                Title = titleDialog.InputText.Trim(),
                Url = url,
                Platform = platform
            };

            await _resourceRepo.AddAsync(item);
            await LoadResourcesAsync();
            SetStatus($"Kaynak eklendi: {item.Title}");
        }

        private async void BtnDeleteResource_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is int id)
            {
                var confirm = planlama_app.Windows.MessageDialogWindow.Show("Bu kaynağı silmek istediğinize emin misiniz?", "Sil", MessageBoxButton.YesNo, MessageBoxImage.Question, this);
                if (confirm == planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes)
                {
                    await _resourceRepo.DeleteAsync(id);
                    await LoadResourcesAsync();
                }
            }
        }

        private void ResourceItem_Click(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            if ((sender as TextBlock)?.DataContext is ResourceItem item && !string.IsNullOrWhiteSpace(item.Url))
            {
                try
                {
                    var psi = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = item.Url,
                        UseShellExecute = true
                    };
                    System.Diagnostics.Process.Start(psi);
                }
                catch (Exception ex)
                {
                    planlama_app.Windows.MessageDialogWindow.Show($"Link açılamadı: {ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
                }
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // BUTON OLAY İŞLEYİCİLERİ
        // ═══════════════════════════════════════════════════════════════

        private void CmbTheme_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CmbTheme.SelectedItem is ComboBoxItem item && item.Content != null)
            {
                planlama_app.Themes.ThemeManager.ApplyTheme(item.Content.ToString()!);
            }
        }

        private async void BtnAddTask_Click(object sender, RoutedEventArgs e)
        {
            if (TabCategories.SelectedIndex == 0)
            {
                planlama_app.Windows.MessageDialogWindow.Show("Lütfen görev eklemek için 'Tümü' sekmesi haricinde spesifik bir kategori seçin.", "Hata", MessageBoxButton.OK, MessageBoxImage.Warning, this);
                return;
            }

            // Yeni görev için boş form
            var newTask = new TaskItem { Title = string.Empty, TaskType = TaskType.Bağımsız };
            
            // Eğer bir kategoride isek, onun ID'sini peşinen atayalım
            if (TabCategories.SelectedItem is Category selectedCat && selectedCat.Name != "Tümü")
            {
                newTask.CategoryId = selectedCat.Id;
            }

            var editWindow = new EditTaskWindow(newTask) { Owner = this };
            
            if (editWindow.ShowDialog() == true)
            {
                // İşlemler
            }
            await LoadTasksAsync();
            SetStatus("Liste güncellendi.");
        }

        // ── Txt'den İçe Aktar ──────────────────────────────────────────
        private async void BtnImport_Click(object sender, RoutedEventArgs e)
        {
            int? defaultCategoryId = (TabCategories.SelectedItem as Category)?.Id;

            int? targetCategoryId = null;
            var categories = await _categoryRepo.GetAllAsync();
            var selectWindow = new planlama_app.Windows.SelectCategoryWindow(categories, defaultCategoryId) { Owner = this };

            if (selectWindow.ShowDialog() == true)
            {
                targetCategoryId = selectWindow.SelectedCategoryId;
            }
            else
            {
                return; // Kategori seçimi iptal edildi
            }

            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                InitialDirectory = AppDomain.CurrentDomain.BaseDirectory,
                Title            = "İçe Aktarılacak Dosyayı Seç",
                Filter           = "Metin Dosyaları (*.txt)|*.txt|Tüm Dosyalar (*.*)|*.*",
                RestoreDirectory = true
            };

            if (dialog.ShowDialog() != true) return;

            SetLoading(true, $"'{System.IO.Path.GetFileName(dialog.FileName)}' içe aktarılıyor...");

            try
            {
                var result = await _importService.ImportFromTxtAsync(dialog.FileName, targetCategoryId);

                // Hata detayları varsa göster
                string detail = result.SkippedCount > 0
                    ? $"\n\nAtlanan satırlar:\n{string.Join("\n", result.Errors)}"
                    : string.Empty;

                planlama_app.Windows.MessageDialogWindow.Show(
                    $"✅ İçe Aktarma Tamamlandı!\n\n" +
                    $"Aktarıldı : {result.SuccessCount} görev\n" +
                    $"Atlandı   : {result.SkippedCount} satır{detail}",
                    "İçe Aktarma Sonucu",
                    MessageBoxButton.OK,
                    result.SkippedCount > 0 ? MessageBoxImage.Warning : MessageBoxImage.Information, this);

                await LoadTasksAsync();
            }
            catch (System.IO.FileNotFoundException)
            {
                planlama_app.Windows.MessageDialogWindow.Show("Seçilen dosya bulunamadı.", "Hata",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"İçe aktarma sırasında hata:\n{ex.Message}", "Hata",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
            }
        }

        // ── Şablon Dosyası Oluştur ve Göster (AI/LLM) ──────────────────
        private void BtnTemplate_Click(object sender, RoutedEventArgs e)
        {
            string templatePath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "sablon_gorevler.txt");

            string templateContent = """
                # ==============================================================================
                # GÖREV PLANI İÇE AKTARMA ŞABLONU (AI / LLM Dostu)
                # ==============================================================================
                # Bu dosyayı yapay zekaya (LLM) vererek bu formatta görevler üretmesini isteyebilirsiniz.
                # Format Yapısı (Sütunlar '|' karakteri ile ayrılmalıdır):
                # [Tarih (yyyy-MM-dd)] | [Tip (B veya Z)] | [ChainId] | [Sıra] | [Süre (dk)] | [Görev Başlığı]
                #
                # Kurallar:
                # 1. Yorum satırları '#' ile başlamalıdır. Boş satırlar ve yorum satırları atlanır.
                # 2. Tarih alanını boş bırakırsanız görev tarihsiz (null) olarak kaydedilir.
                # 3. Tip: B (Bağımsız görevler için), Z (Zincirleme birbirine bağlı görevler için)
                # 4. ChainId: Zincirleme görevleri gruplamak için ortak bir isim yazılmalıdır (B'ler için boş kalır).
                # 5. Sıra: Zincir içindeki sıra numarasını temsil eder (B'ler için 0 yazılır).
                # 6. Süre (Dakika): Görevin yaklaşık süresidir. Boş bırakılabilir.
                # 7. Başlık: Görevin açıklama metnidir, boş olamaz.
                # ==============================================================================

                # 1. Örnek: Bağımsız Tarihsiz Görev (Süresiz)
                | B | | 0 | | Faturaları öde ve makbuzları arşivle

                # 2. Örnek: Bağımsız Tarihli ve Süreli Görev (120 Dakika)
                2026-07-20 | B | | 0 | 120 | Haftalık genel ev temizliğini yap

                # 3. Örnek: Birbirine Bağlı Zincirleme Görev Grubu (Romence Dil Kursu - 45'er dk)
                2026-07-15 | Z | ROMENCE_KURS | 1 | 45 | Harfleri ve telaffuz kurallarını öğren
                2026-07-16 | Z | ROMENCE_KURS | 2 | 45 | Günlük hayatta sık kullanılan 50 kelimeyi ezberle
                2026-07-17 | Z | ROMENCE_KURS | 3 | 60 | Temel selamlama ve basit cümle kurma çalışması yap
                """;

            try
            {
                System.IO.File.WriteAllText(templatePath, templateContent, System.Text.Encoding.UTF8);

                // Dosyayı Notepad veya varsayılan programla aç
                var psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName        = templatePath,
                    UseShellExecute = true
                };
                System.Diagnostics.Process.Start(psi);

                SetStatus("Şablon dosyası başarıyla oluşturuldu ve açıldı.");
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Şablon dosyası oluşturulamadı:\n{ex.Message}", "Hata",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        // ── Yenile ────────────────────────────────────────────────────
        private async void BtnRefresh_Click(object sender, RoutedEventArgs e)
            => await LoadTasksAsync();

        // ── Tamamlandı ────────────────────────────────────────────────
        private async void BtnComplete_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            // Toggle: tamamlandı ↔ bekliyor
            bool newState = !task.IsCompleted;

            try
            {
                const string sql = "UPDATE Tasks SET IsCompleted = @IsCompleted WHERE Id = @Id;";
                using var conn = DatabaseHelper.GetConnection();
                await conn.ExecuteAsync(sql, new { IsCompleted = newState ? 1 : 0, task.Id });

                SetStatus(newState
                    ? $"✅ '{task.Title}' tamamlandı olarak işaretlendi."
                    : $"↩ '{task.Title}' tekrar aktif hale getirildi.");

                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show(ex.Message, "Güncelleme Hatası",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        // ── Ertele ────────────────────────────────────────────────────
        private async void BtnPostpone_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            try
            {
                int updated;

                if (task.TaskType == TaskType.Zincirleme)
                {
                    // Cascade: zincirin geri kalanını da ertele
                    updated = await _repository.PostponeChainTaskCascadeAsync(task.Id);

                    SetStatus(updated > 0
                        ? $"⛓ '{task.Title}' ve zincirin {updated} görevi 1 gün ertelendi."
                        : $"⚠ Zincir görevi ertelemek için ChainId gerekli.");
                }
                else
                {
                    // Bağımsız: sadece bu görevi ertele
                    updated = await _repository.PostponeIndependentTaskAsync(task.Id);

                    SetStatus(updated > 0
                        ? $"📅 '{task.Title}' 1 gün ertelendi."
                        : "⚠ Görev bulunamadı veya zaten Zincirleme tipinde.");
                }

                if (updated > 0) await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show(ex.Message, "Erteleme Hatası",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        // ── Düzenle ───────────────────────────────────────────────────
        private async void BtnEdit_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            var editWindow = new EditTaskWindow(task)
            {
                Owner = this
            };

            if (editWindow.ShowDialog() == true)
            {
                SetStatus($"📝 '{task.Title}' başarıyla güncellendi.");
                await LoadTasksAsync();
            }
        }

        // ── Tekil Sil ─────────────────────────────────────────────────
        private async void BtnDelete_Click(object sender, RoutedEventArgs e)
        {
            if ((sender as Button)?.Tag is not TaskItem task) return;

            var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                $"'{task.Title}' görevini silmek istediğinize emin misiniz?",
                "Görevi Sil",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question, this);

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
                planlama_app.Windows.MessageDialogWindow.Show($"Silme sırasında hata oluştu:\n{ex.Message}", "Hata",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
        }

        // ── Seçilenleri Toplu Sil ─────────────────────────────────────
        private async void BtnDeleteSelected_Click(object sender, RoutedEventArgs e)
        {
            var selectedTasks = _allTasks.Where(t => t.IsSelected).ToList();
            if (!selectedTasks.Any()) return;

            var confirm = planlama_app.Windows.MessageDialogWindow.Show(
                $"{selectedTasks.Count} adet görevi silmek istediğinize emin misiniz?",
                "Seçilenleri Sil",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning, this);

            if (confirm != planlama_app.Windows.MessageDialogWindow.DialogResultType.Yes) return;

            SetLoading(true, "Seçili görevler siliniyor...");

            try
            {
                var ids = selectedTasks.Select(t => t.Id);
                int deletedCount = await _repository.DeleteMultipleAsync(ids);

                planlama_app.Services.UndoManager.RecordAction(new planlama_app.Services.UndoAction { ActionType = planlama_app.Services.UndoActionType.BulkDelete, Tasks = selectedTasks });

                SetStatus($"🗑 {deletedCount} görev başarıyla toplu silindi.");
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Toplu silme sırasında hata oluştu:\n{ex.Message}", "Hata",
                                MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
            }
        }

        // ── Çoklu Seçim CheckBox Yönetimi ─────────────────────────────
        private void ChkSelectGroup_Checked(object sender, RoutedEventArgs e)
        {
            if (sender is CheckBox chk && chk.Tag is string groupName)
            {
                var view = System.Windows.Data.CollectionViewSource.GetDefaultView(LvTasks.ItemsSource);
                if (view?.Groups != null)
                {
                    foreach (System.Windows.Data.CollectionViewGroup group in view.Groups)
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
                var view = System.Windows.Data.CollectionViewSource.GetDefaultView(LvTasks.ItemsSource);
                if (view?.Groups != null)
                {
                    foreach (System.Windows.Data.CollectionViewGroup group in view.Groups)
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
        private void ChkSelectAll_Checked(object sender, RoutedEventArgs e)
        {
            if (LvTasks.ItemsSource is System.Collections.IEnumerable visibleItems)
            {
                foreach (var item in visibleItems)
                {
                    if (item is TaskItem task)
                    {
                        task.IsSelected = true;
                    }
                }
            }
            UpdateDeleteSelectedButtonState();
        }

        private void ChkSelectAll_Unchecked(object sender, RoutedEventArgs e)
        {
            if (LvTasks.ItemsSource is System.Collections.IEnumerable visibleItems)
            {
                foreach (var item in visibleItems)
                {
                    if (item is TaskItem task)
                    {
                        task.IsSelected = false;
                    }
                }
            }
            UpdateDeleteSelectedButtonState();
        }

        private void ChkItem_Changed(object sender, RoutedEventArgs e)
        {
            UpdateDeleteSelectedButtonState();
        }

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
                    // Undo Add = Delete
                    await _repository.DeleteAsync(action.Task.Id);
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.Delete)
                {
                    // Undo Delete = Restore
                    await _repository.RestoreAsync(action.Task);
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.BulkDelete)
                {
                    // Undo Bulk Delete = Restore multiple
                    await _repository.RestoreMultipleAsync(action.Tasks);
                }
                else if (action.ActionType == planlama_app.Services.UndoActionType.Update)
                {
                    // Undo Update = Update with PreviousState
                    await _repository.UpdateAsync(action.PreviousState);
                }
                
                SetStatus("Geri alma işlemi (Undo) uygulandı.");
                await LoadTasksAsync();
            }
            catch (Exception ex)
            {
                planlama_app.Windows.MessageDialogWindow.Show($"Geri alma işlemi sırasında hata oluştu:\n{ex.Message}", "Hata", MessageBoxButton.OK, MessageBoxImage.Error, this);
            }
            finally
            {
                SetLoading(false);
                BtnUndo.IsEnabled = planlama_app.Services.UndoManager.CanUndo;
            }
        }

        private void Window_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == System.Windows.Input.Key.Z && (System.Windows.Input.Keyboard.Modifiers & System.Windows.Input.ModifierKeys.Control) == System.Windows.Input.ModifierKeys.Control)
            {
                if (BtnUndo.IsEnabled)
                {
                    BtnUndo_Click(this, new RoutedEventArgs());
                }
            }
        }
        
        /// <summary>
        /// Seçili en az 1 eleman varsa "Seçilenleri Sil" butonunu aktif yapar, aksi halde kapatır.
        /// </summary>
        private void UpdateDeleteSelectedButtonState()
        {
            if (BtnDeleteSelected == null) return;
            
            bool anySelected = _allTasks.Any(t => t.IsSelected);
            BtnDeleteSelected.IsEnabled = anySelected;
        }

        // ═══════════════════════════════════════════════════════════════
        // FİLTRELEME
        // ═══════════════════════════════════════════════════════════════

        private void TxtSearch_TextChanged(object sender, TextChangedEventArgs e) => ApplyFilter();
        private void CmbFilter_SelectionChanged(object sender, SelectionChangedEventArgs e) => ApplyFilter();
        private void Filter_Changed(object sender, RoutedEventArgs e) => ApplyFilter();

        /// <summary>
        /// Arama, tür filtresi ve "tamamlananları gizle" uygular.
        /// </summary>
        private void ApplyFilter()
        {
            // Arayüz nesneleri henüz yüklenmediyse (InitializeComponent aşaması) filtrelemeyi es geç
            if (LvTasks == null || TxtSearch == null || CmbFilter == null || 
                ChkHideCompleted == null || TxtCount == null || PanelEmpty == null)
                return;

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
            if (TabCategories != null && TabCategories.SelectedItem is TabItem selectedTab)
            {
                if (selectedTab.Tag is int categoryId)
                {
                    filtered = filtered.Where(t => t.CategoryId == categoryId);
                }
            }

            // 4) Tamamlananları gizle
            if (ChkHideCompleted?.IsChecked == true)
                filtered = filtered.Where(t => !t.IsCompleted);

            // Özel Sıralama: Önce Gruplama sırası (DateGroupOrder), sonra TaskType, sonra ChainId, sonra DueDate vs.
            var list = filtered
                .OrderBy(t => t.DateGroupOrder)
                .ThenBy(t => t.TaskType)
                .ThenBy(t => t.ChainId)
                .ThenBy(t => t.OrderIndex)
                .ThenBy(t => t.DueDate)
                .ToList();

            // Gruplama için CollectionView ayarlanması
            var collectionView = CollectionViewSource.GetDefaultView(list);
            collectionView.GroupDescriptions.Clear();
            collectionView.GroupDescriptions.Add(new PropertyGroupDescription(nameof(TaskItem.DateGroup)));

            LvTasks.ItemsSource = collectionView;
            TxtCount.Text       = $"{list.Count} görev";
            PanelEmpty.Visibility = list.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
            LvTasks.Visibility    = list.Count == 0 ? Visibility.Collapsed : Visibility.Visible;
        }

        // ═══════════════════════════════════════════════════════════════
        // YARDIMCI: UI Durum Yönetimi
        // ═══════════════════════════════════════════════════════════════

        private void SetLoading(bool isLoading, string? message = null)
        {
            LoadingSpinner.Visibility = isLoading ? Visibility.Visible : Visibility.Collapsed;
            BtnImport.IsEnabled       = !isLoading;
            BtnRefresh.IsEnabled      = !isLoading;

            if (message is not null)
                TxtStatus.Text = message;
        }

        private void SetStatus(string message) => TxtStatus.Text = message;
    }
}