using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Api.Filters;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Policy = "AdminOnly")] // Sadece canoser@gmail.com erişebilir
    public class AdminController : ControllerBase
    {
        private readonly ISettingsService _settingsService;

        public AdminController(ISettingsService settingsService)
        {
            _settingsService = settingsService;
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = await _settingsService.GetAllSettingsAsync();
            return Ok(settings);
        }

        public class UpdateSettingRequest
        {
            public string Value { get; set; } = string.Empty;
            public string Description { get; set; } = string.Empty;
        }

        [HttpPut("settings/{key}")]
        [ServiceFilter(typeof(IdempotencyFilter))]
        public async Task<IActionResult> UpdateSetting(string key, [FromBody] UpdateSettingRequest request)
        {
            if (string.IsNullOrEmpty(request.Value))
            {
                return BadRequest("Value alanı boş olamaz.");
            }

            await _settingsService.UpdateSettingAsync(key, request.Value, request.Description);
            
            return Ok(new { Message = $"{key} ayarı başarıyla güncellendi." });
        }
    }
}
