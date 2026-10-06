namespace MentorumApi.DTOs
{
    public class CourseDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? TeacherId { get; set; }
        public required string Name { get; set; }
        public required string Type { get; set; }
        public string? Color { get; set; }
        public int IsActive { get; set; }
        public bool TeacherCanViewProfile { get; set; }
        public bool TeacherCanViewContact { get; set; }
        public bool TeacherCanViewHomework { get; set; }
        public bool TeacherCanManageHomework { get; set; }
        public bool TeacherCanViewExams { get; set; }
        public bool TeacherCanManageExams { get; set; }
        public bool TeacherCanViewNotes { get; set; }
        public bool TeacherCanAddNotes { get; set; }
        public bool TeacherCanViewSchedule { get; set; }
        public bool TeacherCanManageSchedule { get; set; }
        public int StudentCount { get; set; }
    }

    public class CreateCourseRequest
    {
        public required string Name { get; set; }
        public string Type { get; set; } = "DERS";
        public Guid? SubjectId { get; set; }
        public Guid? TeacherId { get; set; }
        public string? Color { get; set; }
        public bool? TeacherCanViewProfile { get; set; }
        public bool? TeacherCanViewContact { get; set; }
        public bool? TeacherCanViewHomework { get; set; }
        public bool? TeacherCanManageHomework { get; set; }
        public bool? TeacherCanViewExams { get; set; }
        public bool? TeacherCanManageExams { get; set; }
        public bool? TeacherCanViewNotes { get; set; }
        public bool? TeacherCanAddNotes { get; set; }
        public bool? TeacherCanViewSchedule { get; set; }
        public bool? TeacherCanManageSchedule { get; set; }
    }

    public class UpdateCourseRequest
    {
        public string? Name { get; set; }
        public string? Type { get; set; }
        public Guid? SubjectId { get; set; }
        public Guid? TeacherId { get; set; }
        public string? Color { get; set; }
        public bool? TeacherCanViewProfile { get; set; }
        public bool? TeacherCanViewContact { get; set; }
        public bool? TeacherCanViewHomework { get; set; }
        public bool? TeacherCanManageHomework { get; set; }
        public bool? TeacherCanViewExams { get; set; }
        public bool? TeacherCanManageExams { get; set; }
        public bool? TeacherCanViewNotes { get; set; }
        public bool? TeacherCanAddNotes { get; set; }
        public bool? TeacherCanViewSchedule { get; set; }
        public bool? TeacherCanManageSchedule { get; set; }
    }

    public class AddCourseStudentRequest { public required Guid StudentId { get; set; } }
    public class AddCourseGroupRequest { public required Guid GroupId { get; set; } }
}
