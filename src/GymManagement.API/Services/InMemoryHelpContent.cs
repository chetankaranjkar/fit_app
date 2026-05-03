using System.Linq;
using GymManagement.Core.DTOs;

namespace GymManagement.API.Services;

/// <summary>In-memory help content for SaaS onboarding. Replace with CMS or DB later.</summary>
public static class InMemoryHelpContent
{
    public static HelpTooltipDto? TooltipOrDefault(string helpKey)
    {
        var k = helpKey.Trim().ToLowerInvariant();
        if (Tooltips.TryGetValue(k, out var text))
            return new HelpTooltipDto { HelpKey = helpKey, Text = text };
        return new HelpTooltipDto { HelpKey = helpKey, Text = "No tooltip text is configured for this field yet." };
    }

    public static HelpModuleArticleDto? ModuleArticle(string moduleKey)
    {
        var k = moduleKey.Trim().ToLowerInvariant();
        return ModuleArticles.TryGetValue(k, out var a) ? a : null;
    }

    public static HelpWalkthroughDto? Walkthrough(string moduleKey)
    {
        var k = moduleKey.Trim().ToLowerInvariant();
        return Walkthroughs.TryGetValue(k, out var w) ? w : null;
    }

    public static IReadOnlyList<HelpCategoryDto> Categories { get; } = new[]
    {
        new HelpCategoryDto { Id = "getting-started", Name = "Getting started", Description = "Orientation for gym owners", SortOrder = 0 },
        new HelpCategoryDto { Id = "members-access", Name = "Members & access", Description = "Directory, QR, and attendance", SortOrder = 1 },
        new HelpCategoryDto { Id = "billing", Name = "Billing & plans", Description = "Payments and memberships", SortOrder = 2 },
        new HelpCategoryDto { Id = "training", Name = "Training", Description = "Workouts and exercises", SortOrder = 3 },
    };

    public static HelpArticleDetailDto? ArticleById(string id)
    {
        var key = id.Trim().ToLowerInvariant();
        return ArticleDetails.TryGetValue(key, out var d) ? d : null;
    }

    public static IReadOnlyList<HelpArticleListItemDto> ArticlesByCategory(string? categoryId, string? search)
    {
        IEnumerable<HelpArticleListItemDto> q = ArticleIndex;
        if (!string.IsNullOrWhiteSpace(categoryId))
            q = q.Where(a => string.Equals(a.CategoryId, categoryId.Trim(), StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(a =>
                a.Title.Contains(s, StringComparison.OrdinalIgnoreCase)
                || (a.Summary?.Contains(s, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        return q.OrderBy(a => a.Title).ToList();
    }

    private static readonly Dictionary<string, string> Tooltips = new(StringComparer.OrdinalIgnoreCase)
    {
        ["members.search"] = "Filter the member list by name, email, or phone. Press Enter or blur to apply.",
        ["members.add"] = "Creates a new member profile. You can assign plans and trainers after saving.",
        ["members.export"] = "Download a spreadsheet of visible members (UI placeholder until export is wired).",
        ["payments.record"] = "Record in-person or manual payments against a member invoice.",
        ["attendance.filter"] = "Narrow check-ins by date range or method (QR, manual, etc.).",
    };

    private static readonly Dictionary<string, HelpModuleArticleDto> ModuleArticles = new(StringComparer.OrdinalIgnoreCase)
    {
        ["members"] = new HelpModuleArticleDto
        {
            ModuleKey = "members",
            Title = "Members (Users)",
            Description = "Your central directory of gym members and their profiles.",
            Bullets = new[]
            {
                "Search and filter to find someone quickly.",
                "Open a row to view full profile, memberships, and history.",
                "Use Add Member to onboard new clients.",
                "Deactivate instead of delete when someone pauses membership.",
            },
        },
        ["payments"] = new HelpModuleArticleDto
        {
            ModuleKey = "payments",
            Title = "Payments",
            Description = "Track revenue, invoices, and payment status.",
            Bullets = new[]
            {
                "Review pending and completed transactions.",
                "Link payments to membership plans where configured.",
                "Export or print for accounting (where enabled).",
            },
        },
        ["attendance"] = new HelpModuleArticleDto
        {
            ModuleKey = "attendance",
            Title = "Attendance",
            Description = "See who checked in and how (QR scan, manual, etc.).",
            Bullets = new[]
            {
                "Filter by branch and date for reporting.",
                "QR check-ins appear when members use Scan to enter.",
                "Use insights to staff peak hours.",
            },
        },
        ["dashboard"] = new HelpModuleArticleDto
        {
            ModuleKey = "dashboard",
            Title = "Home dashboard",
            Description = "High-level snapshot of members, revenue, and alerts.",
            Bullets = new[]
            {
                "Scan KPI cards for quick health checks.",
                "Open notifications for renewals and issues.",
                "Use shortcuts from cards to jump into work areas.",
            },
        },
        ["help_center"] = new HelpModuleArticleDto
        {
            ModuleKey = "help_center",
            Title = "Help Center",
            Description = "Browse guides by category or search across articles.",
            Bullets = new[]
            {
                "Pick a category on the left to see articles.",
                "Use the search bar to filter titles and summaries.",
                "Press ? anywhere in the app to open contextual help.",
            },
        },
        ["branches"] = new HelpModuleArticleDto
        {
            ModuleKey = "branches",
            Title = "Branches",
            Description = "Manage gym locations used for QR check-in and reporting.",
            Bullets = new[]
            {
                "Add each physical site as its own branch.",
                "Keep addresses accurate for operations.",
                "Coordinate with Owner QR for GPS pins per branch.",
            },
        },
        ["owner_qr"] = new HelpModuleArticleDto
        {
            ModuleKey = "owner_qr",
            Title = "Owner QR",
            Description = "Configure venue GPS, venue QR codes, and optional door hardware.",
            Bullets = new[]
            {
                "Set latitude and longitude (WGS84) so scans validate proximity.",
                "Generate or rotate the printed QR at reception.",
                "Review recent scans for troubleshooting.",
            },
        },
        ["scan"] = new HelpModuleArticleDto
        {
            ModuleKey = "scan",
            Title = "Scan to enter",
            Description = "What members use to check in at the door.",
            Bullets = new[]
            {
                "Members sign in, allow location, then scan your venue QR.",
                "They must be within range of the branch GPS you configured.",
                "If something fails, verify Owner QR settings and QR expiry.",
            },
        },
    };

    private static readonly Dictionary<string, HelpWalkthroughDto> Walkthroughs = new(StringComparer.OrdinalIgnoreCase)
    {
        ["members"] = new HelpWalkthroughDto
        {
            ModuleKey = "members",
            Steps = new[]
            {
                new WalkthroughStepDto
                {
                    Order = 0,
                    Selector = "[data-walkthrough=\"members-header\"]",
                    Title = "Member directory",
                    Body = "This is your live list of gym members. Metrics above summarize counts and preferred visit times.",
                },
                new WalkthroughStepDto
                {
                    Order = 1,
                    Selector = "[data-walkthrough=\"members-add\"]",
                    Title = "Add a member",
                    Body = "Click here to create a new profile. You can assign memberships from the member detail page.",
                },
                new WalkthroughStepDto
                {
                    Order = 2,
                    Selector = "[data-walkthrough=\"members-table\"]",
                    Title = "Table actions",
                    Body = "Open a row to edit, deactivate, or view history. Use search to narrow the list quickly.",
                },
            },
        },
    };

    private static readonly Dictionary<string, HelpArticleDetailDto> ArticleDetails = new(StringComparer.OrdinalIgnoreCase);

    private static IReadOnlyList<HelpArticleListItemDto> BuildArticleIndex()
    {
        var list = new List<HelpArticleListItemDto>
        {
            new()
            {
                Id = "welcome",
                CategoryId = "getting-started",
                Title = "Welcome to your gym console",
                Summary = "Layout, roles, and where to start.",
            },
            new()
            {
                Id = "first-week",
                CategoryId = "getting-started",
                Title = "Your first week checklist",
                Summary = "Branches, members, and QR setup order.",
            },
            new()
            {
                Id = "member-profiles",
                CategoryId = "members-access",
                Title = "Managing member profiles",
                Summary = "Search, add, and lifecycle best practices.",
            },
            new()
            {
                Id = "qr-entry",
                CategoryId = "members-access",
                Title = "QR entry for members",
                Summary = "Owner QR, GPS, and scan flow.",
            },
            new()
            {
                Id = "payments-overview",
                CategoryId = "billing",
                Title = "Payments overview",
                Summary = "Recording and reconciling revenue.",
            },
            new()
            {
                Id = "plans",
                CategoryId = "billing",
                Title = "Membership plans",
                Summary = "Selling and renewing plans.",
            },
            new()
            {
                Id = "workouts-intro",
                CategoryId = "training",
                Title = "Workouts & assignments",
                Summary = "Building programs for members.",
            },
        };

        ArticleDetails["welcome"] = new HelpArticleDetailDto
        {
            Id = "welcome",
            CategoryId = "getting-started",
            Title = "Welcome to your gym console",
            Summary = "Layout, roles, and where to start.",
            BodyMarkdown =
                "## Overview\n\nThe sidebar groups **Members**, **Training**, **Access & QR**, and operations modules.\n\nOwners and staff use the full console; members typically only need **Scan to enter**.\n\n## Tips\n\n- Use **?** on your keyboard to open contextual help.\n- The floating **Help** button is always available.",
        };
        ArticleDetails["first-week"] = new HelpArticleDetailDto
        {
            Id = "first-week",
            CategoryId = "getting-started",
            Title = "Your first week checklist",
            Summary = "Branches, members, and QR setup order.",
            BodyMarkdown =
                "## Recommended order\n\n1. **Branches** — add each site.\n2. **Owner QR** — set GPS and generate venue QR.\n3. **Members** — import or add members.\n4. **Membership plans** — define what you sell.\n5. **Scan to enter** — test with a staff phone.",
        };
        ArticleDetails["member-profiles"] = new HelpArticleDetailDto
        {
            Id = "member-profiles",
            CategoryId = "members-access",
            Title = "Managing member profiles",
            Summary = "Search, add, and lifecycle best practices.",
            BodyMarkdown =
                "## Members page\n\nUse **Add Member** for walk-ins. Prefer **deactivate** over delete to keep billing history.\n\nOpen a member to attach **membership plans** and **trainers**.",
        };
        ArticleDetails["qr-entry"] = new HelpArticleDetailDto
        {
            Id = "qr-entry",
            CategoryId = "members-access",
            Title = "QR entry for members",
            Summary = "Owner QR, GPS, and scan flow.",
            BodyMarkdown =
                "## How check-in works\n\nEach branch needs **latitude & longitude** under **Owner QR**. Members allow browser location and scan the printed code.\n\nIf scans fail, verify coordinates, QR expiry, and that the member is within range.",
        };
        ArticleDetails["payments-overview"] = new HelpArticleDetailDto
        {
            Id = "payments-overview",
            CategoryId = "billing",
            Title = "Payments overview",
            Summary = "Recording and reconciling revenue.",
            BodyMarkdown =
                "## Payments\n\nTrack what was collected and what is outstanding. Tie payments to invoices when your workflow uses them.",
        };
        ArticleDetails["plans"] = new HelpArticleDetailDto
        {
            Id = "plans",
            CategoryId = "billing",
            Title = "Membership plans",
            Summary = "Selling and renewing plans.",
            BodyMarkdown =
                "## Plans\n\nDefine duration, price, and entitlements. Assign plans to members from **User membership plans**.",
        };
        ArticleDetails["workouts-intro"] = new HelpArticleDetailDto
        {
            Id = "workouts-intro",
            CategoryId = "training",
            Title = "Workouts & assignments",
            Summary = "Building programs for members.",
            BodyMarkdown =
                "## Training\n\nCreate **exercises** and **workout plans**, then assign them from **Workout Assignments**.",
        };

        return list;
    }

    public static IReadOnlyList<HelpArticleListItemDto> ArticleIndex { get; } = BuildArticleIndex();
}
