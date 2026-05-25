using GymManagement.Core.Interfaces;

namespace GymManagement.Infrastructure.Services
{
    /// <summary>Generates unique trainer employee codes (e.g. TRN-2026-000042).</summary>
    public static class TrainerEmployeeCodeGenerator
    {
        public static async Task<string> GenerateNextAsync(IUnitOfWork unitOfWork, CancellationToken cancellationToken = default)
        {
            var year = DateTime.UtcNow.Year;
            var prefix = $"TRN-{year}-";

            var trainers = (await unitOfWork.Trainers.FindAsync(_ => true)).ToList();
            var maxSeq = 0;
            foreach (var t in trainers)
            {
                if (string.IsNullOrWhiteSpace(t.EmployeeCode) || !t.EmployeeCode.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    continue;
                var suffix = t.EmployeeCode[prefix.Length..];
                if (int.TryParse(suffix, out var n))
                    maxSeq = Math.Max(maxSeq, n);
            }

            for (var attempt = 0; attempt < 1000; attempt++)
            {
                var code = $"{prefix}{(maxSeq + 1 + attempt):D6}";
                var taken = trainers.Any(t =>
                    !string.IsNullOrWhiteSpace(t.EmployeeCode) &&
                    string.Equals(t.EmployeeCode, code, StringComparison.OrdinalIgnoreCase));
                if (!taken)
                    return code;
            }

            return $"{prefix}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        }
    }
}
