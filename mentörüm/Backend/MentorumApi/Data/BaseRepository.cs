using Dapper;

namespace MentorumApi.Data
{
    /// <summary>
    /// IDOR (Insecure Direct Object Reference) koruması için temel repository sınıfı.
    /// Tüm tenant-specific (koç bazlı) sorgular bu sınıf üzerinden geçmelidir.
    /// </summary>
    public abstract class BaseRepository
    {
        protected readonly DbConnectionFactory _connectionFactory;

        protected BaseRepository(DbConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        /// <summary>
        /// SQL sorgusuna otomatik olarak "AND program_id IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)" filtresi ekler.
        /// NOT: Verilen sqlTemplate içinde kesinlikle /**where**/ tag'i bulunmalıdır.
        /// </summary>
        protected async Task<IEnumerable<T>> QueryWithTenantAsync<T>(string sqlTemplate, object parameters, Guid coachId, string? additionalWhere = null, string? tableAlias = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            var builder = new SqlBuilder();
            var template = builder.AddTemplate(sqlTemplate);
            
            var qualifiedColumn = string.IsNullOrEmpty(tableAlias) ? "program_id" : $"{tableAlias}.program_id";
            builder.Where($"{qualifiedColumn} IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)", new { CoachId = coachId });
            if (!string.IsNullOrEmpty(additionalWhere))
            {
                builder.Where(additionalWhere);
            }

            var dp = new DynamicParameters(parameters);
            dp.AddDynamicParams(new { CoachId = coachId });

            return await connection.QueryAsync<T>(template.RawSql, dp);
        }

        protected async Task<T?> QuerySingleOrDefaultWithTenantAsync<T>(string sqlTemplate, object parameters, Guid coachId, string? additionalWhere = null, string? tableAlias = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            var builder = new SqlBuilder();
            var template = builder.AddTemplate(sqlTemplate);
            
            var qualifiedColumn = string.IsNullOrEmpty(tableAlias) ? "program_id" : $"{tableAlias}.program_id";
            builder.Where($"{qualifiedColumn} IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)", new { CoachId = coachId });
            if (!string.IsNullOrEmpty(additionalWhere))
            {
                builder.Where(additionalWhere);
            }

            var dp = new DynamicParameters(parameters);
            dp.AddDynamicParams(new { CoachId = coachId });

            return await connection.QuerySingleOrDefaultAsync<T>(template.RawSql, dp);
        }

        protected async Task<int> ExecuteWithTenantAsync(string sqlTemplate, object parameters, Guid coachId, string? additionalWhere = null, string? tableAlias = null)
        {
            using var connection = _connectionFactory.CreateConnection();
            var builder = new SqlBuilder();
            var template = builder.AddTemplate(sqlTemplate);
            
            var qualifiedColumn = string.IsNullOrEmpty(tableAlias) ? "program_id" : $"{tableAlias}.program_id";
            builder.Where($"{qualifiedColumn} IN (SELECT program_id FROM program_coaches WHERE coach_id = @CoachId)", new { CoachId = coachId });
            if (!string.IsNullOrEmpty(additionalWhere))
            {
                builder.Where(additionalWhere);
            }

            var dp = new DynamicParameters(parameters);
            dp.AddDynamicParams(new { CoachId = coachId });

            return await connection.ExecuteAsync(template.RawSql, dp);
        }
    }
}
