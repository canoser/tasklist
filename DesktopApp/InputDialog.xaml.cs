using System.Windows;

namespace planlama_app
{
    public partial class InputDialog : Window
    {
        public string InputText { get; private set; } = string.Empty;

        public InputDialog(string prompt, string title, string defaultText = "")
        {
            InitializeComponent();
            Title = title;
            TxtPrompt.Text = prompt;
            TxtInput.Text = defaultText;
            TxtInput.Focus();
            TxtInput.SelectAll();
        }

        private void BtnOk_Click(object sender, RoutedEventArgs e)
        {
            InputText = TxtInput.Text;
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
