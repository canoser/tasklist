using System.Windows.Media;
using MaterialDesignThemes.Wpf;
using MaterialDesignColors;
using System.Windows;

namespace planlama_app.Themes
{
    public static class ThemeManager
    {
        private static readonly string ThemeFilePath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data", "theme.txt");

        public static string LoadTheme()
        {
            try
            {
                if (System.IO.File.Exists(ThemeFilePath))
                {
                    return System.IO.File.ReadAllText(ThemeFilePath).Trim();
                }
            }
            catch { }
            return "Koyu Tema (Dark)";
        }

        public static void ApplyTheme(string themeName)
        {
            try { System.IO.File.WriteAllText(ThemeFilePath, themeName); } catch { }

            var paletteHelper = new PaletteHelper();
            var theme = paletteHelper.GetTheme();
            
            // Set basic dark mode for all custom IDE themes
            theme.SetBaseTheme(BaseTheme.Dark);

            string? bgHex = null;
            string? paperHex = null;
            string? cardHex = null;

            switch (themeName)
            {
                case "Monokai":
                    theme.SetPrimaryColor((Color)ColorConverter.ConvertFromString("#F92672")); // Pink
                    theme.SetSecondaryColor((Color)ColorConverter.ConvertFromString("#A6E22E")); // Green
                    bgHex = "#272822";
                    paperHex = "#1E1F1C";
                    cardHex = "#3E3D32";
                    break;
                case "Monokai Dimmed":
                    theme.SetPrimaryColor((Color)ColorConverter.ConvertFromString("#4EC9B0")); // Dimmed Cyan/Green
                    theme.SetSecondaryColor((Color)ColorConverter.ConvertFromString("#DCDCAA")); // Dimmed Yellow
                    bgHex = "#1E1E1E";
                    paperHex = "#252526";
                    cardHex = "#2D2D30";
                    break;
                case "Abyss":
                    theme.SetPrimaryColor((Color)ColorConverter.ConvertFromString("#007ACC")); // Bright Blue
                    theme.SetSecondaryColor((Color)ColorConverter.ConvertFromString("#4D90FE")); // Light Blue
                    bgHex = "#000C18";
                    paperHex = "#001122";
                    cardHex = "#002244";
                    break;
                case "Tokyo Night Light":
                    theme.SetBaseTheme(BaseTheme.Light);
                    theme.SetPrimaryColor((Color)ColorConverter.ConvertFromString("#34548A")); // Blue
                    theme.SetSecondaryColor((Color)ColorConverter.ConvertFromString("#8C4351")); // Red/Magenta
                    bgHex = "#D5D6DB";
                    paperHex = "#E1E2E7";
                    cardHex = "#CFD0D5";
                    break;
                default: // Default Dark
                    theme.SetBaseTheme(BaseTheme.Dark);
                    theme.SetPrimaryColor((Color)ColorConverter.ConvertFromString("#673AB7"));
                    theme.SetSecondaryColor((Color)ColorConverter.ConvertFromString("#009688"));
                    bgHex = null; // Reset custom brushes to fallback to MDT defaults
                    break;
            }

            paletteHelper.SetTheme(theme);
            
            // Apply custom brushes AFTER SetTheme so they are not overwritten!
            SetCustomBrushes(bgHex, paperHex, cardHex);
        }

        private static void SetCustomBrushes(string? bgHex, string? paperHex, string? cardHex)
        {
            if (bgHex == null || paperHex == null || cardHex == null)
            {
                // Clear overrides to fallback to default theme
                Application.Current.Resources.Remove("MaterialDesignBackground");
                Application.Current.Resources.Remove("MaterialDesignPaper");
                Application.Current.Resources.Remove("MaterialDesignCardBackground");
                Application.Current.Resources.Remove("MaterialDesign.Brush.Background");
                Application.Current.Resources.Remove("MaterialDesign.Brush.Paper");
                Application.Current.Resources.Remove("MaterialDesign.Brush.Surface");
                Application.Current.Resources.Remove("MaterialDesign.Brush.Card.Background");

                if (Application.Current.MainWindow != null)
                {
                    Application.Current.MainWindow.ClearValue(Window.BackgroundProperty);
                }
                return;
            }

            var bgBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(bgHex));
            var paperBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(paperHex));
            var cardBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(cardHex));

            // MDT v3 / v4 keys
            Application.Current.Resources["MaterialDesignBackground"] = bgBrush;
            Application.Current.Resources["MaterialDesignPaper"] = paperBrush;
            Application.Current.Resources["MaterialDesignCardBackground"] = cardBrush;

            // MDT v5 keys
            Application.Current.Resources["MaterialDesign.Brush.Background"] = bgBrush;
            Application.Current.Resources["MaterialDesign.Brush.Paper"] = paperBrush;
            Application.Current.Resources["MaterialDesign.Brush.Surface"] = paperBrush;
            Application.Current.Resources["MaterialDesign.Brush.Card.Background"] = cardBrush;

            // Force window background update
            if (Application.Current.MainWindow != null)
            {
                Application.Current.MainWindow.Background = bgBrush;
            }
        }
    }
}
