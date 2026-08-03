using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public UsersController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        /// <summary>
        /// Mevcut (giriş yapmış) kullanıcının tüm verilerini (Görevler, Roller, Çalışma Alanları vb.) siler.
        /// App Store "Hesabı Sil" kuralı gereği kullanılır.
        /// </summary>
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteMyData()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized("Geçerli bir oturum bulunamadı.");
            }

            var success = await _userRepository.DeleteAllUserDataAsync(userId);
            if (!success)
            {
                return StatusCode(500, "Kullanıcı verileri silinirken sunucu hatası oluştu.");
            }

            return NoContent();
        }
    }
}
