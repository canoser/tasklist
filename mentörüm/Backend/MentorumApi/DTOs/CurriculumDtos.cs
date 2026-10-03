using System.ComponentModel.DataAnnotations;

namespace MentorumApi.DTOs
{
    public class SubjectDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public string? ShortCode { get; set; }
        public string? DefaultColor { get; set; }
        public int IsSystemSubject { get; set; }
    }

    public class CurriculumTopicDto
    {
        public Guid Id { get; set; }
        public Guid SubjectId { get; set; }
        public string? Grade { get; set; } // '4'..'12', 'TYT', 'AYT'
        public string? CurriculumType { get; set; } // NEW, OLD
        public int? UnitNumber { get; set; }
        public string? UnitName { get; set; }
        public string? TopicNumber { get; set; }
        public required string TopicName { get; set; }
        public int SortOrder { get; set; }
    }
}
