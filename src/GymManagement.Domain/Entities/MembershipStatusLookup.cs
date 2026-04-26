namespace GymManagement.Domain.Entities
{
    /// <summary>
    /// Lookup table for allowed user_memberships.Status values: Active, Expired, Frozen, Cancelled, Pending.
    /// </summary>
    public class MembershipStatusLookup
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}