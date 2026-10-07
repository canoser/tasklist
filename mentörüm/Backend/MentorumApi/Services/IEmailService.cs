namespace MentorumApi.Services
{
    /// <summary>
    /// E-posta gönderimi için soyutlama.
    /// Gerçek gönderim <see cref="ResendEmailService"/> tarafından yapılır;
    /// RESEND_API_KEY yoksa içerik yalnızca konsola loglanır (asla hata fırlatmaz).
    /// </summary>
    public interface IEmailService
    {
        /// <summary>Şifre sıfırlama bağlantısını e-posta ile gönderir.</summary>
        Task SendPasswordResetEmailAsync(string email, string resetLink);

        /// <summary>Yeni oluşturulan kullanıcıya karşılama ve geçici şifre e-postası gönderir.</summary>
        Task SendWelcomeEmailAsync(string email, string role, string tempPassword);
    }
}
