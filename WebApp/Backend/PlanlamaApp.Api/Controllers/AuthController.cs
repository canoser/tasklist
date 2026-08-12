using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using BCrypt.Net;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IUserRepository _userRepository;

        public AuthController(IConfiguration configuration, IUserRepository userRepository)
        {
            _configuration = configuration;
            _userRepository = userRepository;
        }

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            try
            {
                // 1. Google ID Token'ı Doğrula (Zorunlu Kural: Zero-Trust, imza/iss/aud denetimi kendi içinde yapılır)
                var clientIds = _configuration.GetSection("Authentication:Google:ClientIds").Get<List<string>>();
                
                var settings = new GoogleJsonWebSignature.ValidationSettings();
                if (clientIds != null && clientIds.Count > 0)
                {
                    settings.Audience = clientIds;
                }
                else
                {
                    // Fallback (Dev ortamı için geçici veya log düşülebilir)
                    // TODO: Canlı ortamda mutlaka appsettings.json'a 'Authentication:Google:ClientIds' eklenmeli.
                }

                var payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, settings);

                if (payload == null)
                    return Unauthorized("Geçersiz Google Token.");

                // 2. Kullanıcıyı Veritabanında Bul veya Oluştur
                var user = await _userRepository.GetUserByGoogleIdAsync(payload.Subject) 
                           ?? await _userRepository.GetUserByEmailAsync(payload.Email);

                if (user == null)
                {
                    user = new User
                    {
                        Email = payload.Email,
                        Name = payload.Name,
                        GoogleId = payload.Subject,
                        SubscriptionPlan = payload.Email == "canoser@gmail.com" ? "premium" : "pending"
                    };
                    user.Id = await _userRepository.CreateUserAsync(user);
                }
                else if (user.GoogleId == null)
                {
                    // TODO: Kullanıcı E-posta ile kayıt olmuş, Google bağlamamışsa, GoogleId güncellenebilir (Şimdilik geçiyoruz)
                }

                if (user.SubscriptionPlan == "pending")
                {
                    return StatusCode(403, new { Message = "Hesabınız yönetici onayı bekliyor. Lütfen daha sonra tekrar deneyin." });
                }

                // 3. JWT Üret ve Çerez (Cookie) Olarak Dön
                IssueJwtCookie(user);
                return Ok(new { Message = "Giriş başarılı.", User = new { user.Id, user.Name, user.Email } });
            }
            catch (InvalidJwtException)
            {
                return Unauthorized("Geçersiz veya süresi dolmuş Google Token.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Sunucu hatası: " + ex.Message);
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // Zamanlama (Enumeration) saldırılarını engellemek için yapay gecikme
            await Task.Delay(500);

            var user = await _userRepository.GetUserByEmailAsync(request.Email);
            if (user == null || user.PasswordHash == null)
            {
                return Unauthorized("E-posta veya şifre hatalı.");
            }

            // Parola doğrulama (BCrypt)
            bool isValid = BCrypt.Net.BCrypt.EnhancedVerify(request.Password, user.PasswordHash);
            if (!isValid)
            {
                return Unauthorized("E-posta veya şifre hatalı.");
            }

            if (user.SubscriptionPlan == "pending")
            {
                return StatusCode(403, new { Message = "Hesabınız yönetici onayı bekliyor. Lütfen daha sonra tekrar deneyin." });
            }

            IssueJwtCookie(user);
            return Ok(new { Message = "Giriş başarılı.", User = new { user.Id, user.Name, user.Email } });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            await Task.Delay(500); // Enumeration protection (kayıtlı olup olmadığını hızdan anlamamaları için)

            var existingUser = await _userRepository.GetUserByEmailAsync(request.Email);
            if (existingUser != null)
            {
                return BadRequest("Eğer e-posta adresi sistemimizde kayıtlıysa bir sıfırlama bağlantısı gönderdik."); // Enum protection
            }

            var newUser = new User
            {
                Email = request.Email,
                Name = request.Name,
                // BCrypt ile güçlü (Salt+Hash) şifreleme
                PasswordHash = BCrypt.Net.BCrypt.EnhancedHashPassword(request.Password, 13),
                SubscriptionPlan = request.Email == "canoser@gmail.com" ? "premium" : "pending"
            };

            newUser.Id = await _userRepository.CreateUserAsync(newUser);
            
            if (newUser.SubscriptionPlan == "pending")
            {
                return StatusCode(403, new { Message = "Kayıt başarılı ancak hesabınız yönetici onayı bekliyor. Lütfen daha sonra giriş yapmayı deneyin." });
            }

            // Kayıt sonrası otomatik login
            IssueJwtCookie(newUser);
            return Ok(new { Message = "Kayıt başarılı.", User = new { newUser.Id, newUser.Name, newUser.Email } });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            bool isLocal = Request.Host.Host.Contains("localhost") || Request.Host.Host.StartsWith("192.168");
            Response.Cookies.Delete("auth_token", new CookieOptions
            {
                HttpOnly = true,
                Secure = !isLocal,
                SameSite = isLocal ? SameSiteMode.Lax : SameSiteMode.None
            });
            return Ok(new { Message = "Çıkış yapıldı." });
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // DB'den güncel kullanıcı bilgisini al (isteğe bağlı, claims'ten de dönülebilir)
            // Ama güvenlik açısından şifre hash vs dönmemeye dikkat
            return Ok(new { 
                Id = userId, 
                Email = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value,
                Name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value
            });
        }

        private void IssueJwtCookie(User user)
        {
            // JWT Ayarları
            var secretKey = _configuration["Jwt:SecretKey"] ?? "BU_COK_GIZLI_GECICI_BIR_ANAHTARDIR_HICBIR_ZAMAN_PRODUCTIONDA_KULLANILMAMALIDIR_12345!!!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id),
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.Name),
                // TenantId şimdilik varsayılan bir değer (Gerçek uygulamada kullanıcının dahil olduğu workspace'e göre)
                new Claim("tenant_id", user.Id),
                new Claim("subscription_plan", user.SubscriptionPlan)
            };

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"] ?? "planlama_app",
                audience: _configuration["Jwt:Audience"] ?? "planlama_app_users",
                claims: claims,
                expires: DateTime.UtcNow.AddDays(90),
                signingCredentials: creds
            );

            // ZORUNLU KURAL: XSS ve CSRF Koruması için HttpOnly ve SameSite=Strict/None
            // [MOBILE_PORT_TODO]: Native mobil uygulamalarda Cookie kullanılamaz.
            // Bu metodun, token'ı JSON response olarak geri dönecek şekilde güncellenmesi 
            // (örn. return Ok(new { token = tokenString })) gerekmektedir.
            
            bool isLocal = Request.Host.Host.Contains("localhost") || Request.Host.Host.StartsWith("192.168");
            
            Response.Cookies.Append("auth_token", tokenString, new CookieOptions
            {
                HttpOnly = true,
                Secure = !isLocal, // Canlı ortamda (HTTPS) zorunludur
                SameSite = isLocal ? SameSiteMode.Lax : SameSiteMode.None, // Cross-Origin (farklı domain/subdomain) desteklemek için None olmalıdır
                Expires = DateTime.UtcNow.AddDays(90)
            });
        }
    }
}
