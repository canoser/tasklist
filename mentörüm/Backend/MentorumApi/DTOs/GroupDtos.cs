namespace MentorumApi.DTOs
{
    public class GroupDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public required string Name { get; set; }
        public string? Color { get; set; }
        public string? Description { get; set; }
        public int MemberCount { get; set; }
    }

    public class CreateGroupRequest
    {
        public required string Name { get; set; }
        public string? Color { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateGroupRequest
    {
        public string? Name { get; set; }
        public string? Color { get; set; }
        public string? Description { get; set; }
    }

    public class AddGroupMemberRequest { public required Guid StudentId { get; set; } }
}
