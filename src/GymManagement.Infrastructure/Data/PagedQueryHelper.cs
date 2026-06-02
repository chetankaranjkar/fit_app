using GymManagement.Core.DTOs.Common;

namespace GymManagement.Infrastructure.Data
{
    internal static class PagedQueryHelper
    {
        public static (int Page, int PageSize) Normalize(int page, int pageSize, int maxPageSize = 200)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = Math.Clamp(pageSize, 1, maxPageSize);
            return (safePage, safePageSize);
        }

        public static PagedResultDto<T> ToResult<T>(IReadOnlyList<T> items, int totalCount, int page, int pageSize) =>
            new()
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
            };
    }
}
