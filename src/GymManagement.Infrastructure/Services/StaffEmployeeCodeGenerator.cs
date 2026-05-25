using GymManagement.Core.Interfaces;

namespace GymManagement.Infrastructure.Services
{
    public static class StaffEmployeeCodeGenerator
    {
        public static async Task<string> GenerateNextAsync(IUnitOfWork unitOfWork, CancellationToken cancellationToken = default)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"STF-{year}-";

            var staff = (await unitOfWork.Staff.FindAsync(_ => true)).ToList();
            var maxSeq = 0;
            foreach (var s in staff)
            {
                if (string.IsNullOrWhiteSpace(s.EmployeeCode) || !s.EmployeeCode.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    continue;
                var suffix = s.EmployeeCode[prefix.Length..];
                if (int.TryParse(suffix, out var n))
                    maxSeq = Math.Max(maxSeq, n);
            }

            for (var attempt = 0; attempt < 1000; attempt++)
            {
                var code = $"{prefix}{(maxSeq + 1 + attempt):D6}";
                var taken = staff.Any(s =>
                    !string.IsNullOrWhiteSpace(s.EmployeeCode) &&
                    string.Equals(s.EmployeeCode, code, StringComparison.OrdinalIgnoreCase));
                if (!taken)
                    return code;
            }

            return $"{prefix}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        }
    }
}
