namespace PlanlamaApp.Application.DTOs
{
    public class JoinWorkspaceRequest
    {
        public string InviteCode { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string? LinkedUserId { get; set; }
    }
}
