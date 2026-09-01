using System;
using System.Collections.Generic;

namespace PlanlamaApp.Application.DTOs
{
    public class CalendarImportExportDto
    {
        public List<CategoryExportDto> Categories { get; set; } = new();
        public List<TaskExportDto> Tasks { get; set; } = new();
    }

    public class CategoryExportDto
    {
        public string ImportId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? ParentImportId { get; set; }
        public int SortOrder { get; set; }
    }

    public class TaskExportDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string TaskType { get; set; } = "Soru Çözme";
        public DateTime? Deadline { get; set; }
        public int? TargetCount { get; set; }
        public string? CategoryImportId { get; set; }
        public int? ChainTemplateId { get; set; }
        public string? Metadata { get; set; }
        
        // Backup için ek alanlar (Yapay zeka şablonunda opsiyoneldir)
        public bool IsHomework { get; set; } = false;
        public bool IsTeacherAssigned { get; set; } = false;
        public DateTime? OriginalDeadline { get; set; }
    }
}
