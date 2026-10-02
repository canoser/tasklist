using Dapper;
using MentorumApi.Data;
using Microsoft.AspNetCore.Authorization;
using MentorumApi.DTOs;

namespace MentorumApi.Endpoints;

public static class CurriculumEndpoints
{
    public static void MapCurriculumEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/curriculum").RequireAuthorization();

        group.MapGet("/subjects", async (DbConnectionFactory db) =>
        {
            using var conn = db.CreateConnection();
            var subjects = await conn.QueryAsync<dynamic>("SELECT id as Id, name as Name, grade as Grade FROM curriculum_subjects ORDER BY grade, name");
            return Results.Ok(subjects);
        });

        group.MapGet("/subjects/{subjectId:guid}/topics", async (Guid subjectId, DbConnectionFactory db) =>
        {
            using var conn = db.CreateConnection();
            var topics = await conn.QueryAsync<dynamic>(@"
                SELECT id as Id, name as Name, parent_topic_id as ParentTopicId, order_index as OrderIndex 
                FROM curriculum_topics 
                WHERE subject_id = @SubjectId 
                ORDER BY order_index
            ", new { SubjectId = subjectId });
            return Results.Ok(topics);
        });
    }
}
