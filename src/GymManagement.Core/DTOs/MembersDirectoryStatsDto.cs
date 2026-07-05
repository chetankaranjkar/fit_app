namespace GymManagement.Core.DTOs;

public sealed class MembersDirectoryStatsDto
{
    public int Total { get; set; }
    public int Active { get; set; }
    public int Inactive { get; set; }
    public IReadOnlyList<MemberBatchCountDto> Batches { get; set; } = Array.Empty<MemberBatchCountDto>();
}

public sealed class MemberBatchCountDto
{
    public string Batch { get; set; } = string.Empty;
    public int Count { get; set; }
}
