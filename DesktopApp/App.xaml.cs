using System.Configuration;
using System.Data;
using System.Windows;
using planlama_app.Data;

namespace planlama_app;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : Application
{
    [System.Runtime.InteropServices.DllImport("kernel32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto, SetLastError = true)]
    private static extern bool SetDllDirectory(string lpPathName);

    protected override void OnStartup(StartupEventArgs e)
    {
        AppDomain.CurrentDomain.UnhandledException += (s, ev) => 
        {
            System.IO.File.WriteAllText("crash.txt", ev.ExceptionObject.ToString());
        };
        this.DispatcherUnhandledException += (s, ev) => 
        {
            System.IO.File.WriteAllText("crash.txt", ev.Exception.ToString());
            ev.Handled = true;
            Shutdown(1);
        };

        base.OnStartup(e);

        // Global hata yakalayıcı (herhangi bir beklenmedik hata için)
        AppDomain.CurrentDomain.UnhandledException += (sender, args) =>
        {
            MessageBox.Show($"Kritik Hata:\n{args.ExceptionObject}", "Sistem Hatası", MessageBoxButton.OK, MessageBoxImage.Error);
        };

        try
        {
            // SQLite DLL kütüphanesinin (e_sqlite3.dll) Data alt klasöründen yüklenebilmesi için DLL arama yolunu güncelliyoruz
            string dataPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data");
            
            // Eğer klasör yoksa oluştur (DLL yükleme denemesinden önce klasör var olmalı)
            if (!System.IO.Directory.Exists(dataPath))
            {
                System.IO.Directory.CreateDirectory(dataPath);
            }

            SetDllDirectory(dataPath);

            DatabaseHelper.Initialize();
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Veritabanı başlatılırken hata oluştu:\n{ex.Message}\n\nDetay:\n{ex.StackTrace}", "Başlatma Hatası", MessageBoxButton.OK, MessageBoxImage.Error);
            Shutdown();
        }
    }
}

