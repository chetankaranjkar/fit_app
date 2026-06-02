namespace GymManagement.Core.DTOs.Common
{
    public class PagedQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Search { get; set; }
    }

    public class PagedResultDto<T>
    {
        public IReadOnlyList<T> Items { get; set; } = Array.Empty<T>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize < 1 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    }

    /// <summary>Standard API envelope for paginated list endpoints (camelCase in JSON).</summary>
    public class ApiPagedResponse<T>
    {
        public IReadOnlyList<T> Data { get; set; } = Array.Empty<T>();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalRecords { get; set; }
        public int TotalPages { get; set; }

        public static ApiPagedResponse<T> From(PagedResultDto<T> source) => new()
        {
            Data = source.Items,
            Page = source.Page,
            PageSize = source.PageSize,
            TotalRecords = source.TotalCount,
            TotalPages = source.TotalPages,
        };
    }
}
