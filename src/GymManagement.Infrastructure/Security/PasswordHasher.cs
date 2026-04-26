using System.Security.Cryptography;
using System.Text;

namespace GymManagement.Infrastructure.Security
{
    /// <summary>BCrypt for new passwords; verifies legacy SHA256 (Base64) hashes and supports one-shot upgrade on login.</summary>
    public static class PasswordHasher
    {
        public static string Hash(string password) =>
            BCrypt.Net.BCrypt.HashPassword(password);

        public static bool Verify(string password, string storedHash)
        {
            if (string.IsNullOrEmpty(storedHash))
                return false;
            if (IsBcrypt(storedHash))
                return BCrypt.Net.BCrypt.Verify(password, storedHash);
            return VerifyLegacySha256(password, storedHash);
        }

        public static bool IsBcrypt(string storedHash) =>
            storedHash.StartsWith("$2", StringComparison.Ordinal);

        private static bool VerifyLegacySha256(string password, string storedHash)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(hashedBytes) == storedHash;
        }
    }
}
