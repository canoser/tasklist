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

    public class CurriculumUnitDto
    {
        public int UnitNumber { get; set; }
        public string? UnitName { get; set; }
    }

    public class CurriculumSubjectRefDto
    {
        public required string Name { get; set; }
        public string? ShortCode { get; set; }
    }

    public class CurriculumTopicImportRow
    {
        public string? Subject { get; set; }   // ders adı veya kısa kodu
        public string? Grade { get; set; }     // '4'..'12', 'TYT', 'AYT'
        public string? Type { get; set; }      // NEW | OLD
        public int? Unit { get; set; }         // ünite numarası
        public string? UnitName { get; set; }  // ünite adı
        public string? Topic { get; set; }     // konu no (örn. '1.1')
        public string? TopicName { get; set; } // konu adı
    }

    public class CurriculumExportDto
    {
        public int FormatVersion { get; set; } = 1;
        public string? CurriculumYear { get; set; }
        public string? Grade { get; set; }        // dışa aktarılan sınıf (opsiyonel; sınıf seçilirse dolu)
        public string? Instructions { get; set; }
        public List<CurriculumSubjectRefDto> Subjects { get; set; } = new();
        public List<CurriculumTopicImportRow> Topics { get; set; } = new();
    }

    public class CurriculumImportResultDto
    {
        public int Inserted { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
