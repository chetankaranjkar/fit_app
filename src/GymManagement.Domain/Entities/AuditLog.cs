namespace GymManagement.Domain.Entities
{
    /// <summary>Append-only audit trail (separate from financial audit tables).</summary>
    public class AuditLog
    {
        public long Id { get; set; }
        public int? UserId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Entity { get; set; } = string.Empty;
        public string? OldValue { get; set; }
        public string? NewValue { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
