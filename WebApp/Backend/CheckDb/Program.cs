using System;
using Npgsql;

class Program
{
    static void Main()
    {
        var connStr = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        if (string.IsNullOrEmpty(connStr)) return;

        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        using (var cmd = new NpgsqlCommand("SELECT * FROM \"workspacemembers\"", conn))
        using (var reader = cmd.ExecuteReader())
        {
            while (reader.Read())
            {
                Console.WriteLine($"Id: {reader["id"]}, WorkspaceId: {reader["workspaceid"]}, UserId: {reader["userid"]}, TenantId: {reader["tenantid"]}, Role: {reader["role"]}, IsActiveMember: {reader["isactivemember"]}");
            }
        }
        
        Console.WriteLine("----------------");
        using (var cmd2 = new NpgsqlCommand("SELECT * FROM \"workspaces\"", conn))
        using (var reader2 = cmd2.ExecuteReader())
        {
            while (reader2.Read())
            {
                Console.WriteLine($"W_Id: {reader2["id"]}, TenantId: {reader2["tenantid"]}, OwnerId: {reader2["ownerid"]}, IsActive: {reader2["isactive"]}");
            }
        }

        Console.WriteLine("----------------");
        try
        {
            using (var cmd4 = new NpgsqlCommand(@"
                SELECT w.*, 
                       (SELECT COUNT(*) FROM WorkspaceMembers WHERE WorkspaceId = w.Id AND IsActiveMember = true AND ApprovalStatus = 'Approved') as MemberCount,
                       (SELECT COUNT(*) FROM TaskItems WHERE AssignedByWorkspaceId = w.Id) as TasksCount
                FROM Workspaces w 
                WHERE w.IsActive = true
            ", conn))
            using (var reader4 = cmd4.ExecuteReader())
            {
                while (reader4.Read())
                {
                    Console.WriteLine($"W_Id: {reader4["id"]}, OwnerId: {reader4["ownerid"]}, Name: {reader4["name"]}, MemCnt: {reader4["MemberCount"]}, TaskCnt: {reader4["TasksCount"]}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("QUERY ERROR: " + ex.Message);
        }
    }
}
