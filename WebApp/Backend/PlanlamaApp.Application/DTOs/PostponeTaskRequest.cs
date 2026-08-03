namespace PlanlamaApp.Application.DTOs
{
    public class PostponeTaskRequest
    {
        public int DaysToShift { get; set; }
        public bool PostponeAllChain { get; set; } = false;
    }
}
