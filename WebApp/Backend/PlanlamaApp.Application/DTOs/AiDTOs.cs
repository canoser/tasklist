using System.Text.Json.Serialization;

namespace PlanlamaApp.Application.DTOs
{
    public class AiPlanRequest
    {
        public string Prompt { get; set; } = string.Empty;
        public string Timezone { get; set; } = "Turkey Standard Time";
        public DateTime Today { get; set; } = DateTime.UtcNow;
        public List<WorkspaceMemberDto> TeamMembers { get; set; } = new();
    }

    public class WorkspaceMemberDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // Owner, Member, Observer vs.
    }

    public class AiPlanResponse
    {
        // LLM'in çağırmamızı istediği fonksiyonların listesi (Plan)
        public List<AiToolCall> ToolCalls { get; set; } = new();
        
        // Kullanıcıya gösterilecek onay veya bilgilendirme mesajı (LLM'in düz metin cevabı)
        public string Message { get; set; } = string.Empty;
    }

    public class AiToolCall
    {
        public string ToolName { get; set; } = string.Empty;
        
        // Her tool için parametreler dictionary veya JsonElement olarak tutulabilir.
        // C# tarafında parse ederken JsonSerializer kullanmak kolaylık sağlar.
        public Dictionary<string, object> Parameters { get; set; } = new();
    }

    public class AiExecuteRequest
    {
        // Kullanıcının onayladığı plan (Frontend'den geri gelir)
        public AiPlanResponse Plan { get; set; } = new();
        public int WorkspaceId { get; set; }
        
        // Frontend'den gelen uygulama tercihleri
        public bool ExecuteAll { get; set; }
        public int? ChainLength { get; set; }
        public int? QuestionCount { get; set; }
    }
}
