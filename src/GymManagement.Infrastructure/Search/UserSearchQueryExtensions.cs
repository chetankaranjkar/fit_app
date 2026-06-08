using GymManagement.Core.Search;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Search;

internal static class UserSearchQueryExtensions
{
    public static IQueryable<User> ApplyUserSearchFilter(
        this IQueryable<User> query,
        IQueryable<AuthUser> authUsers,
        string? search)
    {
        var term = UserSearchTerm.Parse(search);
        if (term.IsEmpty || term.IsTooShort)
            return query;

        return term.Kind switch
        {
            UserSearchTermKind.PhoneExact => query.Where(u => u.Phone == term.DigitsOnly),
            UserSearchTermKind.AadhaarExact => query.Where(u => u.AadhaarNumber == term.DigitsOnly),
            UserSearchTermKind.DigitPrefix => query.Where(u =>
                (u.Phone != null && u.Phone.StartsWith(term.DigitsOnly))
                || (u.AadhaarNumber != null && u.AadhaarNumber.StartsWith(term.DigitsOnly))),
            UserSearchTermKind.EmailPrefix => ApplyEmailPrefixFilter(query, authUsers, term.Normalized),
            UserSearchTermKind.FullName => ApplyFullNameFilter(query, term.FirstNamePrefix!, term.LastNamePrefix!),
            UserSearchTermKind.TextPrefix => ApplyTextPrefixFilter(query, authUsers, term.Normalized),
            _ => query,
        };
    }

    public static IQueryable<User> ApplyPreferredGymTimeFilter(
        this IQueryable<User> query,
        IQueryable<Member> members,
        string? preferredGymTime)
    {
        if (string.IsNullOrWhiteSpace(preferredGymTime))
            return query;

        var shift = preferredGymTime.Trim();
        var memberUserIdsForShift = members.AsNoTracking()
            .Where(m => !m.IsDeleted && m.PreferredGymTime == shift)
            .Select(m => m.UserId);

        return query.Where(u =>
            u.PreferredGymTime == shift || memberUserIdsForShift.Contains(u.Id));
    }

    public static IQueryable<User> ApplyMembersOnlyFilter(
        this IQueryable<User> query,
        IQueryable<UserUserType> userUserTypes,
        int memberUserTypeId)
    {
        var memberUserIds = userUserTypes.AsNoTracking()
            .Where(uut => !uut.IsDeleted && uut.UserTypeId == memberUserTypeId)
            .Select(uut => uut.UserId);

        return query.Where(u => memberUserIds.Contains(u.Id));
    }

    private static IQueryable<User> ApplyEmailPrefixFilter(
        IQueryable<User> query,
        IQueryable<AuthUser> authUsers,
        string emailPrefix)
    {
        var matchingUserIds = authUsers.AsNoTracking()
            .Where(a => !a.IsDeleted && a.UserId != null && a.Email.StartsWith(emailPrefix))
            .Select(a => a.UserId!.Value);

        return query.Where(u => matchingUserIds.Contains(u.Id));
    }

    private static IQueryable<User> ApplyFullNameFilter(
        IQueryable<User> query,
        string firstPrefix,
        string lastPrefix)
    {
        return query.Where(u =>
            (u.FirstName.StartsWith(firstPrefix) && u.LastName.StartsWith(lastPrefix))
            || (u.FirstName.StartsWith(lastPrefix) && u.LastName.StartsWith(firstPrefix)));
    }

    private static IQueryable<User> ApplyTextPrefixFilter(
        IQueryable<User> query,
        IQueryable<AuthUser> authUsers,
        string prefix)
    {
        var matchingUserIds = authUsers.AsNoTracking()
            .Where(a => !a.IsDeleted && a.UserId != null && a.Email.StartsWith(prefix))
            .Select(a => a.UserId!.Value);

        return query.Where(u =>
            u.FirstName.StartsWith(prefix)
            || u.LastName.StartsWith(prefix)
            || (u.Phone != null && u.Phone.StartsWith(prefix))
            || matchingUserIds.Contains(u.Id));
    }
}
