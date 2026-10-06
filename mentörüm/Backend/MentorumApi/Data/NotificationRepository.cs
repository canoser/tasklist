using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class NotificationRepository : BaseRepository
    {
        public NotificationRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<IEnumerable<NotificationDto>> GetUserNotificationsAsync(Guid userId)
        {
            var sql = @"
                SELECT 
                    id AS Id, 
                    user_id AS UserId, 
                    type AS Type, 
                    title AS Title, 
                    body AS Body, 
                    is_read AS IsRead, 
                    created_at AS CreatedAt
                FROM notifications
                WHERE user_id = @UserId
                ORDER BY created_at DESC
                LIMIT 50";
            
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<NotificationDto>(sql, new { UserId = userId });
        }

        public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId)
        {
            var sql = @"
                UPDATE notifications 
                SET is_read = 1 
                WHERE id = @Id AND user_id = @UserId";
                
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(sql, new { Id = notificationId, UserId = userId });
            return rows > 0;
        }

        public async Task NotifyProgramCoachesAsync(Guid programId, string type, string title, string body, string? payload = null, Guid? excludeUserId = null)
        {
            var sql = @"
                INSERT INTO notifications (id, user_id, type, title, body, payload)
                SELECT gen_random_uuid(), pc.coach_id, @Type, @Title, @Body, @Payload
                FROM program_coaches pc
                WHERE pc.program_id = @ProgramId
                  AND (@ExcludeUserId IS NULL OR pc.coach_id <> @ExcludeUserId)";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(sql, new { ProgramId = programId, Type = type, Title = title, Body = body, Payload = payload, ExcludeUserId = excludeUserId });
        }

        public async Task NotifyCourseStudentsAsync(Guid courseId, string type, string title, string body, string? payload = null)
        {
            var sql = @"
                INSERT INTO notifications (id, user_id, type, title, body, payload)
                SELECT gen_random_uuid(), t.student_id, @Type, @Title, @Body, @Payload
                FROM (
                    SELECT cs.student_id FROM course_students cs WHERE cs.course_id = @CourseId AND cs.is_active = 1
                    UNION
                    SELECT sgm.student_id FROM course_groups cg
                    JOIN student_group_members sgm ON sgm.group_id = cg.group_id
                    WHERE cg.course_id = @CourseId
                ) t";

            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(sql, new { CourseId = courseId, Type = type, Title = title, Body = body, Payload = payload });
        }

        public async Task<bool> MarkAllAsReadAsync(Guid userId)
        {
            var sql = @"
                UPDATE notifications 
                SET is_read = 1 
                WHERE user_id = @UserId AND is_read = 0";
                
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(sql, new { UserId = userId });
            return rows > 0;
        }
    }
}
