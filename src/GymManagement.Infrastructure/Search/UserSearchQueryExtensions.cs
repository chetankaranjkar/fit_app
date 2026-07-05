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
        return query.Where(u =>
            u.PreferredGymTime == shift
            || members.Any(m => !m.IsDeleted && m.UserId == u.Id && m.PreferredGymTime == shift));
    }

    /// <summary>Members directory: users with <c>MEMBER</c> application role (<c>UserRoles</c>).</summary>
    public static IQueryable<User> ApplyMembersOnlyFilter(
        this IQueryable<User> query,
        IQueryable<UserRole> userRoles,
        int memberRoleId)
    {
        return query.Where(u => userRoles.Any(ur =>
            !ur.IsDeleted && ur.UserId == u.Id && ur.RoleId == memberRoleId));
    }

    /// <summary>Limit directory rows to members with an active coach assignment for the given trainer profile id.</summary>
    public static IQueryable<User> ApplyAssignedToTrainerFilter(
        this IQueryable<User> query,
        IQueryable<UserInstructor> userInstructors,
        int trainerProfileId)
    {
        return query.Where(u => userInstructors.Any(ui =>
            !ui.IsDeleted
            && ui.IsActive
            && !ui.EndDate.HasValue
            && ui.TrainerId == trainerProfileId
            && ui.UserId == u.Id));
    }

    private static IQueryable<User> ApplyEmailPrefixFilter(
        IQueryable<User> query,
        IQueryable<AuthUser> authUsers,
        string emailPrefix)
    {
        return query.Where(u => authUsers.Any(a =>
            !a.IsDeleted && a.UserId == u.Id && a.Email.StartsWith(emailPrefix)));
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
        return query.Where(u =>
            u.FirstName.StartsWith(prefix)
            || u.LastName.StartsWith(prefix)
            || (u.Phone != null && u.Phone.StartsWith(prefix))
            || authUsers.Any(a => !a.IsDeleted && a.UserId == u.Id && a.Email.StartsWith(prefix)));
    }
}
