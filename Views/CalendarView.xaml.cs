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

        public void SetCurrentMonth(DateTime month)
        {
            _currentMonth = new DateTime(month.Year, month.Month, 1);
            RenderCalendar();
        }

        private void RenderCalendar()
        {
            if (GridCalendarDays == null) return;

            GridCalendarDays.Children.Clear();

            // Set Header Text
            var culture = new CultureInfo("tr-TR");
            TxtMonthYear.Text = _currentMonth.ToString("MMMM yyyy", culture);
            TxtMonthYear.Text = char.ToUpper(TxtMonthYear.Text[0]) + TxtMonthYear.Text[1..];

            // Filter tasks by category if specified
            var filteredTasks = _allTasks.AsEnumerable();
            if (_selectedCategoryId.HasValue)
            {
                filteredTasks = filteredTasks.Where(t => t.CategoryId == _selectedCategoryId.Value);
            }

            // Group tasks by date
            var tasksByDate = filteredTasks
                .Where(t => t.DueDate.HasValue)
                .GroupBy(t => t.DueDate!.Value.Date)
                .ToDictionary(g => g.Key, g => g.ToList());

            // First day of month
            DateTime firstDayOfMonth = new DateTime(_currentMonth.Year, _currentMonth.Month, 1);
            int daysInMonth = DateTime.DaysInMonth(_currentMonth.Year, _currentMonth.Month);

            // Day of week offset (Monday = 0, Sunday = 6)
            int dayOfWeekOffset = ((int)firstDayOfMonth.DayOfWeek + 6) % 7;

            // Render Previous Month Padding Days
            DateTime prevMonth = firstDayOfMonth.AddMonths(-1);
            int daysInPrevMonth = DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month);

            for (int i = dayOfWeekOffset - 1; i >= 0; i--)
            {
                int dayNum = daysInPrevMonth - i;
                DateTime date = new DateTime(prevMonth.Year, prevMonth.Month, dayNum);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: true, tasksByDate));
            }

            // Render Current Month Days
            for (int day = 1; day <= daysInMonth; day++)
            {
                DateTime date = new DateTime(_currentMonth.Year, _currentMonth.Month, day);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: false, tasksByDate));
            }

            // Render Next Month Padding Days
            int totalCells = GridCalendarDays.Children.Count;
            int remainingCells = (42 - totalCells % 42) % 42; // Always fill 6 rows (42 cells) or 5 rows
            if (totalCells <= 35 && remainingCells > 7) remainingCells -= 7;

            DateTime nextMonth = firstDayOfMonth.AddMonths(1);
            for (int day = 1; day <= remainingCells; day++)
            {
                DateTime date = new DateTime(nextMonth.Year, nextMonth.Month, day);
                GridCalendarDays.Children.Add(CreateDayCell(date, isOtherMonth: true, tasksByDate));
            }
        }

        private Border CreateDayCell(DateTime date, bool isOtherMonth, Dictionary<DateTime, List<TaskItem>> tasksByDate)
        {
            bool isToday = date.Date == DateTime.Today;
            bool isSelected = _selectedDate.HasValue && date.Date == _selectedDate.Value.Date;

            Border border = new Border
            {
                Margin = new Thickness(2),
                CornerRadius = new CornerRadius(6),
                BorderThickness = new Thickness(isToday || isSelected ? 2 : 1),
                Background = isSelected 
                    ? new SolidColorBrush(Color.FromArgb(40, 33, 150, 243)) 
                    : (isToday ? new SolidColorBrush(Color.FromArgb(25, 76, 175, 80)) : Brushes.Transparent),
                BorderBrush = isToday 
                    ? Brushes.MediumSeaGreen 
                    : (isSelected ? Brushes.DodgerBlue : (SolidColorBrush)FindResource("MaterialDesign.Brush.Divider")),
                Padding = new Thickness(4),
                MinHeight = 85,
                Cursor = Cursors.Hand
            };

            if (isOtherMonth)
            {
                border.Opacity = 0.4;
            }

            Grid cellGrid = new Grid();
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header (Day Number + Add btn)
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Tasks list

            // Top Header: Date number & Add Button
            Grid topGrid = new Grid();
            topGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            TextBlock txtDayNum = new TextBlock
            {
                Text = date.Day.ToString(),
                FontWeight = isToday ? FontWeights.Bold : FontWeights.SemiBold,
                FontSize = 13,
                Foreground = isToday ? Brushes.MediumSeaGreen : (SolidColorBrush)FindResource("MaterialDesign.Brush.Foreground"),
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

            // Tasks Container
            ScrollViewer scrollViewer = new ScrollViewer
            {
                VerticalScrollBarVisibility = ScrollBarVisibility.Hidden,
                HorizontalScrollBarVisibility = ScrollBarVisibility.Disabled,
                Margin = new Thickness(0, 2, 0, 0)
            };

            StackPanel tasksPanel = new StackPanel();

            if (tasksByDate.TryGetValue(date.Date, out var dayTasks) && dayTasks.Count > 0)
            {
                foreach (var task in dayTasks.Take(4)) // Max 4 chips per cell
                {
                    Border taskChip = CreateTaskChip(task);
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

            // Click Handler
            border.MouseLeftButtonDown += (s, e) =>
            {
                _selectedDate = date;
                DateSelected?.Invoke(this, date);
                RenderCalendar();
            };

            return border;
        }

        private Border CreateTaskChip(TaskItem task)
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
                Foreground = task.IsCompleted 
                    ? Brushes.Gray 
                    : (SolidColorBrush)FindResource("MaterialDesign.Brush.Foreground"),
                TextDecorations = task.IsCompleted ? TextDecorations.Strikethrough : null
            };

            chip.Child = txt;

            chip.MouseLeftButtonDown += (s, e) =>
            {
                e.Handled = true;
                TaskClicked?.Invoke(this, task);
            };

            return chip;
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
