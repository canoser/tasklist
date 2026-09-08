using System.Threading.Tasks;

namespace PlanlamaApp.Application.Interfaces
{
    public interface ICoachingSignalRService
    {
        Task NotifyTaskAssigned(string studentUserId, int coachingWorkspaceId);
        Task NotifyScheduleUpdated(string studentUserId);
        Task NotifyLessonChanged(string studentUserId);
        Task NotifyTaskCompleted(string coachUserId, string studentUserId);
        Task NotifyPerformanceAdded(string coachUserId, string studentUserId);
        Task NotifyStreakRevoked(string studentUserId);
    }
}
