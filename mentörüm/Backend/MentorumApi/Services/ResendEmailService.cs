using System.Net.Http;
using System.Net.Http.Json;
using Serilog;

namespace MentorumApi.Services
{
    /// <summary>
    /// Resend (https://resend.com) üzerinden e-posta gönderir.
    /// API anahtarı hardcoded DEĞİLDİR; RESEND_API_KEY ortam değişkeninden okunur.
    /// Anahtar yoksa e-posta içeriği Serilog ile konsola yazılır (lokal geliştirme için).
    /// </summary>
    public class ResendEmailService : IEmailService
    {
        private const string ResendEndpoint = "https://api.resend.com/emails";
        private const string DefaultFromEmail = "Mentörüm <onboarding@resend.dev>";

        private readonly IHttpClientFactory _httpClientFactory;

        public ResendEmailService(IHttpClientFactory httpClientFactory)
        {
            _httpClientFactory = httpClientFactory;
        }

        private static string? ApiKey => Environment.GetEnvironmentVariable("RESEND_API_KEY");
        private static string FromEmail => Environment.GetEnvironmentVariable("RESEND_FROM_EMAIL") ?? DefaultFromEmail;
        private static string BaseUrl => (Environment.GetEnvironmentVariable("APP_BASE_URL") ?? "https://mentorum.dersmatris.com").TrimEnd('/');

        public Task SendPasswordResetEmailAsync(string email, string resetLink)
            => SendAsync(email, "Mentörüm — Şifre Sıfırlama", BuildPasswordResetHtml(resetLink));

        public Task SendWelcomeEmailAsync(string email, string role, string tempPassword)
            => SendAsync(email, "Mentörüm'e Hoş Geldiniz! 🎉", BuildWelcomeHtml(email, role, tempPassword));

        private async Task SendAsync(string to, string subject, string html)
        {
            var apiKey = ApiKey;
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                Log.Information("[EMAIL] RESEND_API_KEY ayarlı değil; e-posta gönderilmedi. To={To} Subject={Subject}\n{Html}", to, subject, html);
                return;
            }

            var payload = new { from = FromEmail, to = new[] { to }, subject, html };

            try
            {
                var client = _httpClientFactory.CreateClient();
                using var request = new HttpRequestMessage(HttpMethod.Post, ResendEndpoint);
                request.Headers.TryAddWithoutValidation("Authorization", $"Bearer {apiKey}");
                request.Content = JsonContent.Create(payload);

                var response = await client.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    Log.Information("[EMAIL] E-posta gönderildi. To={To} Subject={Subject}", to, subject);
                }
                else
                {
                    var body = await response.Content.ReadAsStringAsync();
                    Log.Error("[EMAIL] Resend gönderimi başarısız. Status={Status} Body={Body}", (int)response.StatusCode, body);
                }
            }
            catch (Exception ex)
            {
                Log.Error(ex, "[EMAIL] E-posta gönderilirken hata oluştu. To={To}", to);
            }
        }

        private static string BuildPasswordResetHtml(string resetLink)
        {
            var inner = $@"
      <h1 style='margin:0 0 8px;font-size:20px;color:#111827;'>Şifrenizi mi unuttunuz?</h1>
      <p style='margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;'>Hesabınız için bir şifre sıfırlama talebi aldık. Aşağıdaki butona tıklayarak yeni bir şifre belirleyebilirsiniz.</p>
      <table role='presentation' cellspacing='0' cellpadding='0'><tr><td align='center' style='background:#6366F1;border-radius:8px;'>
        <a href='{resetLink}' target='_blank' style='display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;background:#6366F1;border-radius:8px;'>Şifremi Sıfırla</a>
      </td></tr></table>
      <p style='margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.6;'>Bu bağlantı 1 saat içinde geçerliliğini yitirir. Talebi siz yapmadıysanız bu e-postayı güvenle yok sayabilirsiniz.</p>
      <p style='margin:16px 0 0;font-size:12px;color:#9CA3AF;'>Buton çalışmıyorsa bağlantıyı kopyalayıp tarayıcınıza yapıştırın:<br/><a href='{resetLink}' style='color:#6366F1;word-break:break-all;'>{resetLink}</a></p>";
            return Layout("Şifre Sıfırlama", inner);
        }

        private static string BuildWelcomeHtml(string email, string role, string tempPassword)
        {
            var roleLabel = RoleLabel(role);
            var loginUrl = $"{BaseUrl}/login";
            var inner = $@"
      <h1 style='margin:0 0 8px;font-size:20px;color:#111827;'>Hoş geldiniz! 🎉</h1>
      <p style='margin:0 0 24px;font-size:15px;color:#4B5563;line-height:1.6;'>Mentörüm'de size bir hesap oluşturuldu. Aşağıdaki bilgilerle sisteme giriş yapabilirsiniz.</p>
      <table role='presentation' width='100%' cellspacing='0' cellpadding='0'>
        <tr><td style='padding:12px 16px;font-size:14px;color:#6B7280;'>Rol</td><td style='padding:12px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;'>{roleLabel}</td></tr>
        <tr><td style='padding:12px 16px;font-size:14px;color:#6B7280;border-top:1px solid #EEF2FF;'>E-posta</td><td style='padding:12px 16px;font-size:14px;color:#111827;font-weight:600;text-align:right;border-top:1px solid #EEF2FF;'>{email}</td></tr>
      </table>
      <div style='margin-top:20px;background:#EEF2FF;border:1px dashed #6366F1;border-radius:10px;padding:16px 18px;text-align:center;'>
        <div style='font-size:12px;color:#6366F1;font-weight:600;letter-spacing:1px;text-transform:uppercase;'>Geçici Şifre</div>
        <div style='margin-top:6px;font-family:Consolas,Monaco,monospace;font-size:20px;font-weight:700;letter-spacing:2px;color:#4F46E5;'>{tempPassword}</div>
      </div>
      <table role='presentation' cellspacing='0' cellpadding='0' style='margin-top:24px;'><tr><td align='center' style='background:#6366F1;border-radius:8px;'>
        <a href='{loginUrl}' target='_blank' style='display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;background:#6366F1;border-radius:8px;'>Giriş Yap</a>
      </td></tr></table>
      <p style='margin:24px 0 0;font-size:13px;color:#6B7280;line-height:1.6;'>Güvenliğiniz için ilk girişinizden sonra şifrenizi değiştirmenizi öneririz.</p>
      <p style='margin:16px 0 0;font-size:12px;color:#9CA3AF;'>Site adresi: <a href='{BaseUrl}' style='color:#6366F1;'>{BaseUrl}</a></p>";
            return Layout("Hesabınız Oluşturuldu", inner);
        }

        private static string Layout(string title, string bodyInnerHtml)
        {
            return $@"<!DOCTYPE html>
<html lang='tr'>
<head><meta charset='utf-8' /><meta name='viewport' content='width=device-width, initial-scale=1' /><title>{title}</title></head>
<body style='margin:0;padding:0;background:#F4F5F7;font-family:Segoe UI,Roboto,Arial,sans-serif;'>
  <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='background:#F4F5F7;padding:32px 16px;'>
    <tr><td align='center'>
      <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(17,24,39,0.08);'>
        <tr><td style='background:linear-gradient(135deg,#6366F1,#4F46E5);padding:32px 40px;'>
          <div style='font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;'>Mentörüm</div>
          <div style='font-size:13px;color:#E0E7FF;margin-top:4px;'>{title}</div>
        </td></tr>
        <tr><td style='padding:40px;'>{bodyInnerHtml}</td></tr>
        <tr><td style='padding:20px 40px;background:#F8FAFC;border-top:1px solid #E5E7EB;'>
          <div style='font-size:12px;color:#6B7280;line-height:1.6;'>Bu e-posta Mentörüm platformu tarafından gönderilmiştir.<br/>Yardıma mı ihtiyacınız var? Bu e-postaya yanıt vermeniz yeterli.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>";
        }

        private static string RoleLabel(string role) => role switch
        {
            "Coach" => "Koç",
            "Student" => "Öğrenci",
            "Parent" => "Veli",
            "Teacher" => "Öğretmen",
            "Admin" => "Yönetici",
            _ => role
        };
    }
}

