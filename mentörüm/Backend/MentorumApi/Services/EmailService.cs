using Serilog;

namespace MentorumApi.Services
{
    public class EmailService
    {
        public Task SendInviteEmailAsync(string toEmail, string role, string code, string inviteLink)
        {
            // MVP: SMTP kurulana kadar log'la; ileride gerçek e-posta gönder
            Log.Information(">>> INVITE EMAIL | To: {Email} | Role: {Role} | Code: {Code} | Link: {Link} <<<", toEmail, role, code, inviteLink);
            return Task.CompletedTask;
        }
    }
}
