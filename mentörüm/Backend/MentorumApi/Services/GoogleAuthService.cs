using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;

namespace MentorumApi.Services
{
    public class GoogleAuthService
    {
        private readonly IConfiguration _config;

        public GoogleAuthService(IConfiguration config)
        {
            _config = config;
        }

        public async Task<GoogleJsonWebSignature.Payload?> VerifyGoogleTokenAsync(string idToken)
        {
            try
            {
                var clientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID") ?? _config["Authentication:Google:ClientId"];
                
                if (string.IsNullOrEmpty(clientId))
                {
                    return null;
                }

                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { clientId }
                };

                // Validate the token using Google API
                var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
                return payload;
            }
            catch (InvalidJwtException)
            {
                // Token is invalid
                return null;
            }
        }
    }
}
