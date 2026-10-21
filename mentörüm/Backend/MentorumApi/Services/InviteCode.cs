using System.Security.Cryptography;

namespace MentorumApi.Services
{
    /// <summary>Crockford Base32 davet kodu üretici (karıştırılabilir karakter yok).</summary>
    public static class InviteCode
    {
        private const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

        public static string Generate(int length = 12)
        {
            var chars = new char[length];
            for (int i = 0; i < length; i++)
                chars[i] = Alphabet[RandomNumberGenerator.GetInt32(Alphabet.Length)];
            return new string(chars);
        }

        public static string Normalize(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return string.Empty;
            var sb = new System.Text.StringBuilder();
            foreach (var c in code)
            {
                if (c == '-' || c == ' ') continue;
                sb.Append(char.ToUpperInvariant(c));
            }
            return sb.ToString();
        }
    }
}
