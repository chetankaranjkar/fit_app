namespace GymManagement.Core.DTOs
{
    public class BulkImportMembersRequestDto
    {
        /// <summary>Members to create (max 500 per request).</summary>
        public List<CreateUserDto> Members { get; set; } = new();
    }

    public class BulkImportMembersResultDto
    {
        public int Imported { get; set; }
        public List<string> Log { get; set; } = new();
    }
}
