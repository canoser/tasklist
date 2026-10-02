using Serilog;

namespace MentorumApi.Services
{
    public class EmailService
    {
        public Task SendInviteEmailAsync(string toEmail, string role, string token)
        {
            // MVP: We don't have SMTP setup yet, just log the invite link
            var inviteLink = $"https://app.dersmatris.com/invite?token={token}";
            Log.Information(">>> INVITE EMAIL SENT TO: {Email} | Role: {Role} | Link: {Link} <<<", toEmail, role, inviteLink);
            return Task.CompletedTask;
        }
    }
}
