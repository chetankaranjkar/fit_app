namespace GymManagement.Core.DTOs
{
    public class BulkImportMembersRequestDto
    {
        /// <summary>Members to create (max 500 per request).</summary>
        public List<CreateUserDto> Members { get; set; } = new();

        /// <summary>When true, validate and report duplicates without writing. Skip vs create is unchanged.</summary>
        public bool DryRun { get; set; }
    }

    public class BulkImportMembersResultDto
    {
        public int Imported { get; set; }
        public int WouldImport { get; set; }
        public int Skipped { get; set; }
        public int Failed { get; set; }
        public bool DryRun { get; set; }
        /// <summary>Plain-text lines for older clients. Prefer <see cref="Rows"/>.</summary>
        public List<string> Log { get; set; } = new();
        public List<BulkImportMemberRowResultDto> Rows { get; set; } = new();
    }

    public class BulkImportMemberRowResultDto
    {
        public int SourceRowNumber { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        /// <summary>accepted, skipped, or failed.</summary>
        public string Outcome { get; set; } = "failed";
        public string? Field { get; set; }
        public string? Code { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? HowToFix { get; set; }
        /// <summary>phone, email, or aadhaar when a duplicate was matched.</summary>
        public string? MatchedOn { get; set; }
        public int? ExistingUserId { get; set; }
        public string? ExistingUserLabel { get; set; }
    }
}
