using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.DTOs;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class SharedViewController : ControllerBase
    {
        private readonly ISharedLinkRepository _repository;
        private readonly ISharedLinkService _service;

        public SharedViewController(ISharedLinkRepository repository, ISharedLinkService service)
        {
            _repository = repository;
            _service = service;
        }

        [HttpPost("auth/{token}")]
        public async Task<IActionResult> Authenticate(string token, [FromBody] string pin)
        {
            var link = await _repository.GetByTokenAsync(token);
            if (link == null || !link.IsActive) return NotFound("Link bulunamadı veya pasif.");

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();

            if (_service.IsLocked(link))
            {
                return StatusCode(429, $"Çok fazla hatalı deneme. Kilit süresi bitişi: {link.LockedUntil}");
            }

            bool isValid = _service.VerifyPin(pin, link.PinHash);
            
            // Log access attempt
            await _repository.LogAccessAsync(new SharedLinkAccessLog
            {
                SharedLinkId = link.Id,
                IPAddress = ip,
                Success = isValid,
                UserAgent = Request.Headers["User-Agent"].ToString()
            });

            if (isValid)
            {
                link.FailedAttempts = 0;
                link.LockedUntil = null;
                link.LastAccessedAt = DateTime.UtcNow;
                link.LastAccessIP = ip;
                await _repository.UpdateAsync(link);
                
                // Usually we return a short-lived JWT scoped to this link, 
                // but for Faz 1 we can just return success or scoped data directly.
                // To keep it secure without a real JWT, frontend can pass Token+Pin together 
                // on data fetch, or we can issue a specialized JWT token for the link.
                return Ok(new { Success = true }); 
            }
            else
            {
                link.FailedAttempts++;
                // Exponential backoff logic (1, 2, 4, 8, 16 mins)
                if (link.FailedAttempts >= 3)
                {
                    int lockMinutes = (int)Math.Pow(2, Math.Min(link.FailedAttempts - 3, 4)); // max 16
                    link.LockedUntil = DateTime.UtcNow.AddMinutes(lockMinutes);
                }
                
                await _repository.UpdateAsync(link);

                if (link.LockedUntil.HasValue)
                {
                    return StatusCode(429, $"Hatalı PIN. Hesap kilitlendi. Süre: {link.LockedUntil}");
                }
                return BadRequest("Hatalı PIN. Kalan deneme sayısı azalıyor.");
            }
        }

        [HttpGet("data/{token}")]
        public async Task<IActionResult> GetData(string token, [FromHeader(Name = "X-Pin")] string pin)
        {
            var link = await _repository.GetByTokenAsync(token);
            if (link == null || !link.IsActive) return NotFound();

            if (_service.IsLocked(link)) return StatusCode(429);
            
            if (!_service.VerifyPin(pin, link.PinHash))
            {
                return Unauthorized();
            }

            var dto = await _service.BuildScopedDataAsync(link);
            return Ok(dto);
        }
    }
}
