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
