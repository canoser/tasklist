namespace MentorumApi.DTOs
{
    public class ProgramDto
    {
        public Guid Id { get; set; }
        public required string Name { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
        public int IsActive { get; set; }
        public Guid? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Role { get; set; }          // koçun bu programdaki rolü (YONETICI/YARDIMCI)
        public int StudentCount { get; set; }
    }

    public class CreateProgramRequest
    {
        public required string Name { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
    }

    public class UpdateProgramRequest
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
        public string? Color { get; set; }
    }

    public class ProgramCoachDto
    {
        public Guid CoachId { get; set; }
        public required string FullName { get; set; }
        public required string Email { get; set; }
        public required string Role { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class AddProgramCoachRequest
    {
        public required Guid CoachId { get; set; }
    }

    public class TransferAdminRequest
    {
        public required Guid CoachId { get; set; }
    }
}
