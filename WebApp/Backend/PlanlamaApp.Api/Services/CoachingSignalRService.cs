using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using PlanlamaApp.Api.Hubs;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Api.Services
{
    public class CoachingSignalRService : ICoachingSignalRService
    {
        private readonly IHubContext<AppHub> _hubContext;

        public CoachingSignalRService(IHubContext<AppHub> hubContext)
        {
            _hubContext = hubContext;
        }
        
        public async Task NotifyTaskAssigned(string studentUserId, int coachingWorkspaceId)
        {
            await _hubContext.Clients.User(studentUserId).SendAsync("CoachingTaskAssigned");
        }

        public async Task NotifyScheduleUpdated(string studentUserId)
        {
            await _hubContext.Clients.User(studentUserId).SendAsync("CoachingScheduleUpdated");
        }

        public async Task NotifyLessonChanged(string studentUserId)
        {
            await _hubContext.Clients.User(studentUserId).SendAsync("CoachingLessonChanged");
        }

        public async Task NotifyTaskCompleted(string coachUserId, string studentUserId)
        {
            await _hubContext.Clients.User(coachUserId).SendAsync("StudentTaskCompleted", studentUserId);
        }

        public async Task NotifyPerformanceAdded(string coachUserId, string studentUserId)
        {
            await _hubContext.Clients.User(coachUserId).SendAsync("StudentPerformanceAdded", studentUserId);
        }

        public async Task NotifyStreakRevoked(string studentUserId)
        {
            await _hubContext.Clients.User(studentUserId).SendAsync("StreakRevoked");
        }
    }
}
