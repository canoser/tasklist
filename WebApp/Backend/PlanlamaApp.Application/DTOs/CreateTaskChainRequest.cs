using PlanlamaApp.Domain.Entities;
using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class CreateTaskChainRequest
    {
        public int? WorkspaceId { get; set; }
        public List<string> AssignedUserIds { get; set; } = new List<string>();
        public List<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    }
}
