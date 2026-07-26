using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using MaterialDesignThemes.Wpf;
using planlama_app.Models;

namespace planlama_app.Views
{
    public partial class CalendarView : UserControl
    {
        private DateTime _currentMonth;
        private List<TaskItem> _allTasks = new();
        private int? _selectedCategoryId;
        private DateTime? _selectedDate;

        public event EventHandler<DateTime>? DateSelected;
        public event EventHandler<DateTime>? AddTaskRequested;
        public event EventHandler<TaskItem>? TaskClicked;

        public CalendarView()
        {
            InitializeComponent();
            _currentMonth = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
        }

        public void SetTasks(IEnumerable<TaskItem> tasks, int? categoryId = null)
        {
            _allTasks = tasks.ToList();
            _selectedCategoryId = categoryId;
            RenderCalendar();
        }

        public void ClearSelection()
        {
            _selectedDate = null;
            RenderCalendar();
        }

        public void SetSelectedDate(DateTime? date)
        {
            _selectedDate = date?.Date;
            RenderCalendar();
        }

        public void SetCurrentMonth(DateTime month)
        {
            _currentMonth = new DateTime(month.Year, month.Month, 1);
            RenderCalendar();
        }

        private Brush GetSafeBrush(string key, Brush fallback)
        {
            try
            {
                if (TryFindResource(key) is Brush brush) return brush;
            }
            catch { }
            return fallback;
        }

        private void RenderCalendar()
        {
            if (GridCalendarDays == null) return;

            GridCalendarDays.Children.Clear();

            // Set Header Text
            TxtMonthYear.Text = $"{_currentMonth:MMMM yyyy}";

            DateTime firstDayOfMonth = _currentMonth;
            int daysInMonth = DateTime.DaysInMonth(_currentMonth.Year, _currentMonth.Month);

            // Pazartesi = 1, Pazar = 7
            int dayOfWeek = (int)firstDayOfMonth.DayOfWeek;
            int leadingEmptyDays = (dayOfWeek == 0) ? 6 : dayOfWeek - 1;

            DateTime prevMonth = _currentMonth.AddMonths(-1);
            int daysInPrevMonth = DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month);

            var tasksByDate = _allTasks
                .Where(t => !_selectedCategoryId.HasValue || t.CategoryId == _selectedCategoryId.Value)
                .Where(t => t.DueDate.HasValue)
                .GroupBy(t => t.DueDate!.Value.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Önceki Ayın Günleri
            for (int i = leadingEmptyDays - 1; i >= 0; i--)
            {
                int day = daysInPrevMonth - i;
                DateTime date = new DateTime(prevMonth.Year, prevMonth.Month, day);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: true, tasksByDate));
            }

            // Mevcut Ayın Günleri
            for (int day = 1; day <= daysInMonth; day++)
            {
                DateTime date = new DateTime(_currentMonth.Year, _currentMonth.Month, day);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: false, tasksByDate));
            }

            // Sonraki Ayın Günleri (Grid'i 42 hücreye tamamla)
            int totalCells = GridCalendarDays.Children.Count;
            int trailingEmptyDays = (totalCells <= 35) ? (35 - totalCells) : (42 - totalCells);

            DateTime nextMonth = _currentMonth.AddMonths(1);
            for (int day = 1; day <= trailingEmptyDays; day++)
            {
                DateTime date = new DateTime(nextMonth.Year, nextMonth.Month, day);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: true, tasksByDate));
            }
        }

        private Border CreateDayCell(DateTime date, bool isOtherMonth, Dictionary<DateTime, List<TaskItem>> tasksByDate)
        {
            bool isToday = date.Date == DateTime.Today;
            bool isSelected = _selectedDate.HasValue && date.Date == _selectedDate.Value.Date;

            Brush defaultBorderBrush = GetSafeBrush("MaterialDesignDivider", GetSafeBrush("MaterialDesign.Brush.Divider", Brushes.DimGray));
            Brush foregroundBrush = GetSafeBrush("MaterialDesign.Brush.Foreground", GetSafeBrush("MaterialDesignBody", Brushes.White));

            Brush backgroundBrush;
            Brush borderBrush;
            double borderThickness = 1;

            if (isToday && isSelected)
            {
                // Hem Bugün hem Seçilen Gün (Turkuaz / Cyan)
                backgroundBrush = new SolidColorBrush(Color.FromArgb(60, 0, 188, 212));
                borderBrush = new SolidColorBrush(Color.FromRgb(0, 188, 212));
                borderThickness = 2.5;
            }
            else if (isSelected)
            {
                // Seçilen Gün (Mavi)
                backgroundBrush = new SolidColorBrush(Color.FromArgb(50, 33, 150, 243));
                borderBrush = new SolidColorBrush(Color.FromRgb(33, 150, 243));
                borderThickness = 2.5;
            }
            else if (isToday)
            {
                // Bugün (Yeşil)
                backgroundBrush = new SolidColorBrush(Color.FromArgb(30, 76, 175, 80));
                borderBrush = new SolidColorBrush(Color.FromRgb(76, 175, 80));
                borderThickness = 2.0;
            }
            else
            {
                backgroundBrush = Brushes.Transparent;
                borderBrush = defaultBorderBrush;
                borderThickness = 1;
            }

            Border border = new Border
            {
                Margin = new Thickness(2),
                CornerRadius = new CornerRadius(6),
                BorderThickness = new Thickness(borderThickness),
                Background = backgroundBrush,
                BorderBrush = borderBrush,
                Padding = new Thickness(4),
                MinHeight = 85,
                Cursor = Cursors.Hand
            };

            if (isOtherMonth)
            {
                border.Opacity = 0.4;
            }

            Grid cellGrid = new Grid();
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            Grid topGrid = new Grid();
            topGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            TextBlock txtDayNum = new TextBlock
            {
                Text = date.Day.ToString(),
                FontWeight = (isToday || isSelected) ? FontWeights.Bold : FontWeights.SemiBold,
                FontSize = 13,
                Foreground = (isToday && isSelected)
                    ? new SolidColorBrush(Color.FromRgb(0, 188, 212))
                    : (isSelected ? new SolidColorBrush(Color.FromRgb(33, 150, 243)) : (isToday ? new SolidColorBrush(Color.FromRgb(76, 175, 80)) : foregroundBrush)),
                Margin = new Thickness(4, 2, 0, 2)
            };
            Grid.SetColumn(txtDayNum, 0);
            topGrid.Children.Add(txtDayNum);

            Button btnQuickAdd = new Button
            {
                Content = new PackIcon { Kind = PackIconKind.Plus, Width = 14, Height = 14 },
                Style = (Style)FindResource("MaterialDesignIconButton"),
                Width = 20,
                Height = 20,
                Padding = new Thickness(0),
                ToolTip = $"{date:dd MMMM yyyy} tarihine yeni görev ekle",
                Visibility = Visibility.Collapsed
            };
            btnQuickAdd.Click += (s, e) =>
            {
                e.Handled = true;
                _selectedDate = date;
                AddTaskRequested?.Invoke(this, date);
            };
            Grid.SetColumn(btnQuickAdd, 1);
            topGrid.Children.Add(btnQuickAdd);

            border.MouseEnter += (s, e) => btnQuickAdd.Visibility = Visibility.Visible;
            border.MouseLeave += (s, e) => btnQuickAdd.Visibility = Visibility.Collapsed;

            Grid.SetRow(topGrid, 0);
            cellGrid.Children.Add(topGrid);

            ScrollViewer scrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Hidden,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Margin = new Thickness(0, 2, 0, 0)
            };

            StackPanel tasksPanel = new StackPanel();

            if (tasksByDate.TryGetValue(date.Date, out var dayTasks) && dayTasks.Count > 0)
            {
                foreach (var task in dayTasks.Take(4))
                {
                    Border taskChip = CreateTaskChip(task, foregroundBrush);
                    tasksPanel.Children.Add(taskChip);
                }

                if (dayTasks.Count > 4)
                {
                    TextBlock txtMore = new TextBlock
                    {
                        Text = $"+{dayTasks.Count - 4} daha...",
                        FontSize = 10,
                        FontWeight = FontWeights.SemiBold,
                        Foreground = Brushes.Gray,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        Margin = new Thickness(0, 2, 0, 0)
                    };
                    tasksPanel.Children.Add(txtMore);
                }
            }

            scrollViewer.Content = tasksPanel;
            Grid.SetRow(scrollViewer, 1);
            cellGrid.Children.Add(scrollViewer);

            border.Child = cellGrid;

            border.PreviewMouseLeftButtonDown += (s, e) =>
            {
                if (e.OriginalSource is DependencyObject source && IsChildOf(source, btnQuickAdd))
                {
                    return;
                }

                _selectedDate = date;
                DateSelected?.Invoke(this, date);
                RenderCalendar();
            };

            return border;
        }

        private Border CreateTaskChip(TaskItem task, Brush foregroundBrush)
        {
            Color catColor = GetCategoryColor(task.CategoryName);
            
            Border chip = new Border
            {
                CornerRadius = new CornerRadius(4),
                Background = task.IsCompleted 
                    ? new SolidColorBrush(Color.FromArgb(50, 158, 158, 158)) 
                    : new SolidColorBrush(Color.FromArgb(60, catColor.R, catColor.G, catColor.B)),
                BorderBrush = new SolidColorBrush(catColor),
                BorderThickness = new Thickness(1, 0, 0, 0),
                Padding = new Thickness(4, 2, 4, 2),
                Margin = new Thickness(0, 1, 0, 1),
                ToolTip = $"{task.Title}\nKategori: {task.CategoryName ?? "Genel"}\nDurum: {(task.IsCompleted ? "Tamamlandı" : "Bekliyor")}",
                Cursor = Cursors.Hand
            };

            TextBlock txt = new TextBlock
            {
                Text = (task.IsCompleted ? "✓ " : "") + task.Title,
                FontSize = 10.5,
                TextTrimming = TextTrimming.CharacterEllipsis,
                Foreground = task.IsCompleted ? Brushes.Gray : foregroundBrush,
                TextDecorations = task.IsCompleted ? TextDecorations.Strikethrough : null
            };

            chip.Child = txt;

            chip.PreviewMouseLeftButtonDown += (s, e) =>
            {
                e.Handled = true;
                if (task.DueDate.HasValue)
                {
                    _selectedDate = task.DueDate.Value.Date;
                    DateSelected?.Invoke(this, task.DueDate.Value.Date);
                    RenderCalendar();
                }
                TaskClicked?.Invoke(this, task);
            };

            return chip;
        }

        private static bool IsChildOf(DependencyObject? child, DependencyObject parent)
        {
            while (child != null)
            {
                if (child == parent) return true;
                child = VisualTreeHelper.GetParent(child);
            }
            return false;
        }

        private Color GetCategoryColor(string? categoryName)
        {
            if (string.IsNullOrWhiteSpace(categoryName)) return Colors.DodgerBlue;

            return categoryName.ToLower() switch
            {
                var s when s.Contains("iş") || s.Contains("work") => Color.FromRgb(33, 150, 243),
                var s when s.Contains("kişisel") || s.Contains("personal") => Color.FromRgb(76, 175, 80),
                var s when s.Contains("yazılım") || s.Contains("kod") => Color.FromRgb(156, 39, 176),
                var s when s.Contains("acil") || s.Contains("önemli") => Color.FromRgb(244, 67, 54),
                var s when s.Contains("eğitim") || s.Contains("ders") => Color.FromRgb(255, 152, 0),
                _ => Color.FromRgb(0, 188, 212)
            };
        }

        private void BtnPrevMonth_Click(object sender, RoutedEventArgs e)
        {
            SetCurrentMonth(_currentMonth.AddMonths(-1));
        }

        private void BtnNextMonth_Click(object sender, RoutedEventArgs e)
        {
            SetCurrentMonth(_currentMonth.AddMonths(1));
        }

        private void BtnToday_Click(object sender, RoutedEventArgs e)
        {
            _selectedDate = DateTime.Today;
            SetCurrentMonth(DateTime.Today);
            DateSelected?.Invoke(this, DateTime.Today);
        }
    }
}
