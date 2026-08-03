namespace PlanlamaApp.Application.DTOs
{
    public static class AiToolSchemas
    {
        public static object GetTools()
        {
            return new object[]
            {
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "create_task",
                        description = "Creates a single task or homework for a specific user.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                title = new { type = "string", description = "Title of the task" },
                                categoryId = new { type = "integer", description = "ID of the category (e.g. Math, Physics)" },
                                deadline = new { type = "string", description = "Deadline in ISO 8601 format" },
                                assignedUserId = new { type = "string", description = "The ID of the user to assign the task to" }
                            },
                            required = new[] { "title", "categoryId", "deadline", "assignedUserId" }
                        }
                    }
                },
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "create_task_chain",
                        description = "Creates a chain of identical tasks for multiple users or a sequence of tasks.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                title = new { type = "string", description = "Base title of the task" },
                                categoryId = new { type = "integer", description = "ID of the category" },
                                deadline = new { type = "string", description = "Deadline in ISO 8601 format" },
                                chainLength = new { type = "integer", description = "How many days/parts this chain spans (max 5)" },
                                questionCount = new { type = "integer", description = "How many questions/pages per task" },
                                assignedUserIds = new { type = "array", items = new { type = "string" }, description = "List of User IDs" }
                            },
                            required = new[] { "title", "categoryId", "deadline", "chainLength", "questionCount", "assignedUserIds" }
                        }
                    }
                },
                new
                {
                    type = "function",
                    function = new
                    {
                        name = "postpone_chain",
                        description = "Postpones a task and optionally all subsequent tasks in its chain.",
                        parameters = new
                        {
                            type = "object",
                            properties = new
                            {
                                taskId = new { type = "integer", description = "The ID of the task to postpone" },
                                daysToShift = new { type = "integer", description = "Number of days to shift the deadline forward" },
                                postponeAllChain = new { type = "boolean", description = "If true, postpones this task and all following tasks in the chain" }
                            },
                            required = new[] { "taskId", "daysToShift", "postponeAllChain" }
                        }
                    }
                }
            };
        }
    }
}
