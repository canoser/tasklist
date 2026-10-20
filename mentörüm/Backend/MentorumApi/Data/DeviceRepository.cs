using Dapper;
using MentorumApi.DTOs;

namespace MentorumApi.Data
{
    public class DeviceRepository : BaseRepository
    {
        public DeviceRepository(DbConnectionFactory connectionFactory) : base(connectionFactory) { }

        public async Task<Guid> UpsertAsync(Guid userId, string deviceUid, string platform, string label)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid>(@"
                INSERT INTO user_devices (id, user_id, device_uid, platform, label)
                VALUES (@Id, @UserId, @DeviceUid, @Platform, @Label)
                ON CONFLICT (user_id, device_uid)
                DO UPDATE SET last_seen_at = NOW(), label = EXCLUDED.label, platform = EXCLUDED.platform
                RETURNING id",
                new { Id = Guid.NewGuid(), UserId = userId, DeviceUid = deviceUid, Platform = platform, Label = label });
        }

        public async Task<IEnumerable<DeviceDto>> ListAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.QueryAsync<DeviceDto>(@"
                SELECT d.id AS Id, d.device_uid AS DeviceUid, d.platform AS Platform, d.label AS Label,
                       CASE WHEN u.download_device_id = d.id THEN true ELSE false END AS IsSelected
                FROM user_devices d
                JOIN users u ON u.id = d.user_id
                WHERE d.user_id = @UserId
                ORDER BY d.last_seen_at DESC",
                new { UserId = userId });
        }

        public async Task<bool> SetDownloadDeviceAsync(Guid userId, Guid deviceId)
        {
            using var conn = _connectionFactory.CreateConnection();
            var rows = await conn.ExecuteAsync(@"
                UPDATE users SET download_device_id = @DeviceId
                WHERE id = @UserId
                  AND EXISTS (SELECT 1 FROM user_devices WHERE id = @DeviceId AND user_id = @UserId)",
                new { UserId = userId, DeviceId = deviceId });
            return rows > 0;
        }

        public async Task SetHideDevicePickerAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            await conn.ExecuteAsync(
                "UPDATE users SET hide_device_picker_tip = 1 WHERE id = @UserId",
                new { UserId = userId });
        }

        public async Task<Guid?> GetDownloadDeviceIdAsync(Guid userId)
        {
            using var conn = _connectionFactory.CreateConnection();
            return await conn.ExecuteScalarAsync<Guid?>(
                "SELECT download_device_id FROM users WHERE id = @UserId",
                new { UserId = userId });
        }
    }
}
