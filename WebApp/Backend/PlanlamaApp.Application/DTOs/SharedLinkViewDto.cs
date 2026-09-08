using System;
using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class SharedLinkViewDto
    {
        public string StudentName { get; set; } = string.Empty;
        public string LinkType { get; set; } = string.Empty;
        public string? CoachParentNote { get; set; } // Only for Parent link type
        
        // Contains filtered data based on scope (e.g. only specific category tasks/exams)
        // Publicly safe structures
        public object? Schedule { get; set; }
        public object? RecentExams { get; set; }
        public object? RecentTasks { get; set; }
    }
}
