using System.Data;
using Dapper;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Infrastructure.Repositories
{
    public abstract class BaseRepository
    {
        protected readonly IDbConnection _dbConnection;
        protected readonly string _tenantId;

        protected BaseRepository(IDbConnection dbConnection, ITenantProvider tenantProvider)
        {
            _dbConnection = dbConnection;
            _tenantId = tenantProvider.GetTenantId();
            
            if (string.IsNullOrEmpty(_tenantId))
            {
                throw new UnauthorizedAccessException("TenantId bulunamadı! İşlem durduruldu.");
            }
        }

        /// <summary>
        /// SQL sorgusuna otomatik olarak TenantId filtresi enjekte eder.
        /// Böylece otonom ajan veya geliştirici filtreyi yazmayı unutsa bile güvenlik zafiyeti oluşmaz.
        /// </summary>
        protected string InjectTenantFilter(string sql)
        {
            string lowerSql = sql.ToLowerInvariant().TrimStart();

            // INSERT sorguları WHERE kabul etmez. TenantId değerinin doğrudan Values içerisine 
            // eklenmiş olması beklenir. Eğer yoksa işlemi güvenli bir şekilde reddeder.
            if (lowerSql.StartsWith("insert "))
            {
                if (!lowerSql.Contains("tenantid"))
                    throw new InvalidOperationException("INSERT sorgusunda 'TenantId' kolonu bulunamadı! Multi-Tenant veri sızdırma ihlali engellendi.");
                return sql;
            }

            // Eğer sorgu zaten TenantId içeriyorsa dokunma (Manuel filtre eklenmişse)
            if (sql.Contains("TenantId", StringComparison.OrdinalIgnoreCase))
                return sql;

            // UNION, INTERSECT, EXCEPT gibi karmaşık sorgularda string manipülasyonu risklidir.
            if (lowerSql.Contains(" union ") || lowerSql.Contains(" intersect ") || lowerSql.Contains(" except ") || (lowerSql.Contains("select ") && lowerSql.LastIndexOf("select ") > lowerSql.IndexOf("select ")))
            {
                throw new InvalidOperationException("UNION, INTERSECT veya Subquery içeren karmaşık SQL sorguları 'BaseRepository.InjectTenantFilter' tarafından otomatik filtrelenemez. Lütfen SQL sorgunuza 'TenantId = @TenantId' şartını manuel olarak ekleyiniz. (Bulgu 11)");
            }

            string filter = " TenantId = @TenantId ";

            int orderByIndex = lowerSql.IndexOf("order by");
            int groupByIndex = lowerSql.IndexOf("group by");
            int limitIndex = lowerSql.IndexOf("limit");

            // Sorgunun sonuna mı yoksa ORDER BY/GROUP BY öncesine mi ekleyeceğimizi bulalım.
            int insertIndex = sql.Length;
            if (orderByIndex > -1) insertIndex = Math.Min(insertIndex, orderByIndex);
            if (groupByIndex > -1) insertIndex = Math.Min(insertIndex, groupByIndex);
            if (limitIndex > -1) insertIndex = Math.Min(insertIndex, limitIndex);

            bool hasWhere = lowerSql.Substring(0, insertIndex).Contains("where ");

            string clause = hasWhere ? $" AND {filter} " : $" WHERE {filter} ";

            return sql.Insert(insertIndex, clause);
        }

        protected async Task<IEnumerable<T>> QueryAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null)
        {
            var finalSql = InjectTenantFilter(sql);
            
            var parameters = new DynamicParameters(param);
            parameters.Add("@TenantId", _tenantId);

            return await _dbConnection.QueryAsync<T>(finalSql, parameters, transaction);
        }

        protected async Task<T?> QueryFirstOrDefaultAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null)
        {
            var finalSql = InjectTenantFilter(sql);
            
            var parameters = new DynamicParameters(param);
            parameters.Add("@TenantId", _tenantId);

            return await _dbConnection.QueryFirstOrDefaultAsync<T>(finalSql, parameters, transaction);
        }

        protected async Task<int> ExecuteAsync(string sql, object? param = null, IDbTransaction? transaction = null)
        {
            var finalSql = InjectTenantFilter(sql);
            
            var parameters = new DynamicParameters(param);
            parameters.Add("@TenantId", _tenantId);

            return await _dbConnection.ExecuteAsync(finalSql, parameters, transaction);
        }

        protected async Task<T> ExecuteScalarAsync<T>(string sql, object? param = null, IDbTransaction? transaction = null)
        {
            var finalSql = InjectTenantFilter(sql);
            
            var parameters = new DynamicParameters(param);
            parameters.Add("@TenantId", _tenantId);

            return await _dbConnection.ExecuteScalarAsync<T>(finalSql, parameters, transaction);
        }
    }
}
