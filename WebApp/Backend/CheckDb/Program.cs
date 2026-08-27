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
            using (var cmd4 = new NpgsqlCommand("SELECT \"id\", \"email\" FROM \"users\"", conn))
            using (var reader4 = cmd4.ExecuteReader())
            {
                while (reader4.Read())
                {
                    Console.WriteLine($"UserId: {reader4["id"]}, Email: {reader4["email"]}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("QUERY ERROR: " + ex.Message);
        }
    }
}
