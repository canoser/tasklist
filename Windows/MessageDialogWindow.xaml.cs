using System;
using System.Windows;
using System.Windows.Media;
using MaterialDesignThemes.Wpf;

namespace planlama_app.Windows
{
    public partial class MessageDialogWindow : Window
    {
        public enum DialogResultType
        {
            None,
            Ok,
            Yes,
            No,
            Cancel
        }

        public DialogResultType Result { get; private set; } = DialogResultType.None;

        public MessageDialogWindow(string message, string title = "Mesaj", MessageBoxButton buttons = MessageBoxButton.OK, MessageBoxImage image = MessageBoxImage.Information)
        {
            InitializeComponent();
            TxtTitle.Text = title;
            TxtMessage.Text = message;

            // İkon Ayarı
            switch (image)
            {
                case MessageBoxImage.Error:
                    IconMessage.Kind = PackIconKind.AlertCircle;
                    IconMessage.Foreground = new SolidColorBrush(Colors.Red);
                    break;
                case MessageBoxImage.Warning:
                    IconMessage.Kind = PackIconKind.Alert;
                    IconMessage.Foreground = new SolidColorBrush(Colors.Orange);
                    break;
                case MessageBoxImage.Question:
                    IconMessage.Kind = PackIconKind.HelpCircle;
                    IconMessage.Foreground = new SolidColorBrush(Colors.DodgerBlue);
                    break;
                default:
                    IconMessage.Kind = PackIconKind.Information;
                    IconMessage.Foreground = new SolidColorBrush(Colors.MediumSeaGreen);
                    break;
            }

            // Buton Ayarı
            switch (buttons)
            {
                case MessageBoxButton.OK:
                    BtnOk.Visibility = Visibility.Visible;
                    break;
                case MessageBoxButton.OKCancel:
                    BtnOk.Visibility = Visibility.Visible;
                    BtnCancel.Visibility = Visibility.Visible;
                    break;
                case MessageBoxButton.YesNo:
                    BtnYes.Visibility = Visibility.Visible;
                    BtnNo.Visibility = Visibility.Visible;
                    break;
                case MessageBoxButton.YesNoCancel:
                    BtnYes.Visibility = Visibility.Visible;
                    BtnNo.Visibility = Visibility.Visible;
                    BtnCancel.Visibility = Visibility.Visible;
                    break;
            }
        }

        private void BtnOk_Click(object sender, RoutedEventArgs e)
        {
            Result = DialogResultType.Ok;
            DialogResult = true;
            Close();
        }

        private void BtnYes_Click(object sender, RoutedEventArgs e)
        {
            Result = DialogResultType.Yes;
            DialogResult = true;
            Close();
        }

        private void BtnNo_Click(object sender, RoutedEventArgs e)
        {
            Result = DialogResultType.No;
            DialogResult = false;
            Close();
        }

        private void BtnCancel_Click(object sender, RoutedEventArgs e)
        {
            Result = DialogResultType.Cancel;
            DialogResult = false;
            Close();
        }

        public static DialogResultType Show(string message, string title = "Mesaj", MessageBoxButton buttons = MessageBoxButton.OK, MessageBoxImage image = MessageBoxImage.Information, Window? owner = null)
        {
            var dialog = new MessageDialogWindow(message, title, buttons, image);
            if (owner != null) dialog.Owner = owner;
            dialog.ShowDialog();
            return dialog.Result;
        }
    }
}
