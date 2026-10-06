using MentorumApi.Data;
using MentorumApi.DTOs;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace MentorumApi.Tests
{
    public class SchoolAccessTests : IClassFixture<IntegrationTestFixture>
    {
        private readonly SchoolAccessRepository _repo;

        private static readonly Guid ProgramA = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        private static readonly Guid ProgramB = Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
        private static readonly Guid TeacherA = Guid.Parse("44444444-4444-4444-4444-444444444444");
        private static readonly Guid CourseA = Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc");
        private static readonly Guid StudentB = Guid.Parse("55555555-5555-5555-5555-555555555555");
        private static readonly Guid StudentC = Guid.Parse("66666666-6666-6666-6666-666666666666");

        public SchoolAccessTests(IntegrationTestFixture fixture)
        {
            var config = new ConfigurationBuilder().Build();
            _repo = new SchoolAccessRepository(new DbConnectionFactory(config));
        }

        [Fact]
        public async Task GetCourseAccess_OwnerTeacher_ReturnsPermissions()
        {
            var access = await _repo.GetCourseAccessAsync(CourseA, TeacherA);

            Assert.NotNull(access);
            Assert.Equal(CourseA, access!.CourseId);
            Assert.True(access.CanViewHomework);
            Assert.True(access.CanManageHomework);
            Assert.False(access.CanViewContact); // varsayılan 0
            Assert.False(access.CanManageExams); // varsayılan 0
        }

        [Fact]
        public async Task GetCourseAccess_NonOwnerTeacher_ReturnsNull()
        {
            var stranger = Guid.NewGuid(); // dersin öğretmeni değil
            var access = await _repo.GetCourseAccessAsync(CourseA, stranger);

            Assert.Null(access);
        }

        [Fact]
        public async Task GetCourseStudentIds_ReturnsDistinctUnion()
        {
            var ids = (await _repo.GetCourseStudentIdsAsync(CourseA)).ToList();

            Assert.Contains(StudentB, ids); // doğrudan kayıt
            Assert.Contains(StudentC, ids); // grup üzerinden
            Assert.Equal(2, ids.Count);
        }

        [Fact]
        public async Task IsTeacherInProgram_SameProgramTrue_OtherProgramFalse()
        {
            Assert.True(await _repo.IsTeacherInProgramAsync(TeacherA, ProgramA));
            Assert.False(await _repo.IsTeacherInProgramAsync(TeacherA, ProgramB));
        }

        [Fact]
        public async Task GetTeacherProgramId_ReturnsProgramA()
        {
            Assert.Equal(ProgramA, await _repo.GetTeacherProgramIdAsync(TeacherA));
        }

        [Fact]
        public async Task GetStudentProgramId_ReturnsProgramB_ForStudentA()
        {
            var studentA = Guid.Parse("33333333-3333-3333-3333-333333333333");
            Assert.Equal(ProgramB, await _repo.GetStudentProgramIdAsync(studentA));
        }

        [Fact]
        public void MaskStudent_WithoutContactPermission_MasksEmail()
        {
            var student = new StudentDetailDto { Id = Guid.NewGuid(), FullName = "Öğrenci", Email = "s@test.com", Grade = 11, Track = "SAY" };
            var access = new CourseAccessDto { CanViewContact = false, CanViewProfile = true };

            var masked = SchoolAccessRepository.MaskStudent(student, access);

            Assert.Null(masked.Email);
            Assert.Equal(11, masked.Grade);
            Assert.Equal("SAY", masked.Track);
        }

        [Fact]
        public void MaskStudent_WithoutProfilePermission_MasksProfile()
        {
            var student = new StudentDetailDto { Id = Guid.NewGuid(), FullName = "Öğrenci", Email = "s@test.com", Grade = 11, Track = "SAY" };
            var access = new CourseAccessDto { CanViewContact = true, CanViewProfile = false };

            var masked = SchoolAccessRepository.MaskStudent(student, access);

            Assert.Equal("s@test.com", masked.Email);
            Assert.Null(masked.Grade);
            Assert.Null(masked.Track);
        }
    }
}
