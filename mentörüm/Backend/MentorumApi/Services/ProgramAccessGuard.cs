using Dapper;
using MentorumApi.Data;

namespace MentorumApi.Services
{
    /// <summary>
    /// Merkezi çok kiracılı erişim denetimi (IDOR önlemi).
    /// Endpoint'ler ve repository'ler sahiplik kontrollerini bu servis üzerinden yapar;
    /// böylece yetki mantığı tek yerde tutulur ve xUnit ile test edilebilir.
    /// Tenant modeli çok boyutludur: coach/program, coach/student, parent/student, teacher/course.
    /// </summary>
    public class ProgramAccessGuard
    {
        private readonly DbConnectionFactory _dbFactory;

        public ProgramAccessGuard(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        /// <summary>Koçun programa üye olup olmadığını döner (YONETICI veya YARDIMCI).</summary>
        public async Task<bool> IsCoachInProgramAsync(Guid coachId, Guid programId)
        {
            using var conn = _dbFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM program_coaches WHERE program_id = @ProgramId AND coach_id = @CoachId",
                new { ProgramId = programId, CoachId = coachId });
            return found != null;
        }

        /// <summary>Koçun programa erişimi yoksa fırlatır.</summary>
        public async Task EnsureCoachInProgramAsync(Guid coachId, Guid programId)
        {
            if (!await IsCoachInProgramAsync(coachId, programId))
                throw new UnauthorizedAccessException("FORBIDDEN");
        }

        /// <summary>Koçun sahip olduğu öğrencinin program_id'sini döner; yoksa null.</summary>
        public async Task<Guid?> GetOwnedStudentProgramAsync(Guid coachId, Guid studentId)
        {
            using var conn = _dbFactory.CreateConnection();
            return await conn.QuerySingleOrDefaultAsync<Guid?>(
                @"SELECT s.program_id FROM students s
                  JOIN program_coaches pc ON pc.program_id = s.program_id AND pc.coach_id = @CoachId
                  WHERE s.id = @StudentId",
                new { CoachId = coachId, StudentId = studentId });
        }

        /// <summary>Koç öğrencinin sahibi değilse fırlatır.</summary>
        public async Task EnsureCoachOwnsStudentAsync(Guid coachId, Guid studentId)
        {
            if (await GetOwnedStudentProgramAsync(coachId, studentId) == null)
                throw new UnauthorizedAccessException("FORBIDDEN");
        }

        /// <summary>Velinin (kabul edilmiş) öğrencisi olup olmadığını döner.</summary>
        public async Task<bool> IsParentOfStudentAsync(Guid parentId, Guid studentId)
        {
            using var conn = _dbFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM student_parents WHERE parent_id = @ParentId AND student_id = @StudentId AND is_accepted = 1",
                new { ParentId = parentId, StudentId = studentId });
            return found != null;
        }

        /// <summary>Öğretmenin derse atanıp atanmadığını döner.</summary>
        public async Task<bool> IsTeacherOfCourseAsync(Guid teacherId, Guid courseId)
        {
            using var conn = _dbFactory.CreateConnection();
            var found = await conn.ExecuteScalarAsync<int?>(
                "SELECT 1 FROM courses WHERE id = @CourseId AND teacher_id = @TeacherId AND is_active = 1",
                new { CourseId = courseId, TeacherId = teacherId });
            return found != null;
        }
    }
}
