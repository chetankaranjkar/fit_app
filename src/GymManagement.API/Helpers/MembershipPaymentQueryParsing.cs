using GymManagement.Core.DTOs;
using GymManagement.Domain.Entities;

namespace GymManagement.API.Helpers;

internal static class MembershipPaymentQueryParsing
{
    public static MembershipPaymentTransactionQuery ParseTransactionListQuery(
        string? fromDate,
        string? toDate,
        string? status,
        string? method,
        int? userId)
    {
        return new MembershipPaymentTransactionQuery
        {
            FromDate = ParseDateOnly(fromDate),
            ToDate = ParseDateOnly(toDate),
            UserId = userId is > 0 ? userId : null,
            Status = ParseEnum<MembershipPaymentTransactionStatus>(status),
            Method = ParseEnum<MembershipPaymentMethod>(method),
        };
    }

    private static DateTime? ParseDateOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTime.TryParse(value, out var parsed) ? parsed.Date : null;
    }

    private static TEnum? ParseEnum<TEnum>(string? value) where TEnum : struct, Enum
    {
        if (string.IsNullOrWhiteSpace(value) || value.Equals("all", StringComparison.OrdinalIgnoreCase))
            return null;
        return Enum.TryParse<TEnum>(value, ignoreCase: true, out var parsed) ? parsed : null;
    }
}
