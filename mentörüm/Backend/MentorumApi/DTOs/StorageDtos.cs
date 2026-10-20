namespace MentorumApi.DTOs
{
    public class CreateUploadUrlRequest
    {
        public string FileName { get; set; } = "";
        public long FileSizeInBytes { get; set; }
        public string ContentType { get; set; } = "";
        public Guid? ProgramId { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? HomeworkId { get; set; }
        public Guid? StudentQuestionId { get; set; }
        public Guid? RecipientUserId { get; set; }
    }

    public class DeliverRequest
    {
        public Guid? DeviceId { get; set; }
        public string? LocalPath { get; set; }
        public string? FileHash { get; set; }
    }

    public class RecipientOptionDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Role { get; set; } = "";
    }

    public class UploadDto
    {
        public Guid Id { get; set; }
        public Guid ProgramId { get; set; }
        public Guid SenderUserId { get; set; }
        public Guid RecipientUserId { get; set; }
        public Guid? CourseId { get; set; }
        public Guid? HomeworkId { get; set; }
        public Guid? StudentQuestionId { get; set; }
        public string ObjectKey { get; set; } = "";
        public string ContentType { get; set; } = "";
        public long SizeBytes { get; set; }
        public string OriginalName { get; set; } = "";
        public string Status { get; set; } = "";
    }

    public class StorageUsageDto
    {
        public double UsedMb { get; set; }
        public int QuotaMb { get; set; }
        public double UsedPercent { get; set; }
        public int WarnPercent { get; set; }
        public bool ShouldWarn { get; set; }
        public string StorageMode { get; set; } = "LOCAL";
    }

    public class AdminUpdateCoachStorageRequest
    {
        public int? QuotaMb { get; set; }
        public int? WarnPercent { get; set; }
        public string? StorageMode { get; set; } // 'LOCAL' | 'ONLINE'
    }

    public class UpsertDeviceRequest
    {
        public string DeviceUid { get; set; } = "";
        public string Platform { get; set; } = "web";
        public string Label { get; set; } = "";
    }

    public class DeviceDto
    {
        public Guid Id { get; set; }
        public string DeviceUid { get; set; } = "";
        public string Platform { get; set; } = "";
        public string Label { get; set; } = "";
        public bool IsSelected { get; set; }
    }

    public class SetDownloadDeviceRequest
    {
        public Guid DeviceId { get; set; }
    }

    public class QuestionCollectionDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = "";
        public Guid ProgramId { get; set; }
        public int ItemCount { get; set; }
    }

    public class CreateQuestionCollectionRequest
    {
        public string Title { get; set; } = "";
    }

    public class TeacherFileSharingRequest
    {
        public bool Allowed { get; set; }
    }
}
