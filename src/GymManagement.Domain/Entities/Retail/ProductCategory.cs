namespace GymManagement.Domain.Entities.Retail
{
    /// <summary>
    /// Self-referencing category hierarchy for retail products.
    /// Examples: Supplements → Pre Workout, Accessories → Wrist Bands.
    /// Independent of internal gym assets (GymOps).
    /// </summary>
    public class ProductCategory : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        /// <summary>Optional parent for hierarchy. Null = top-level category.</summary>
        public int? ParentCategoryId { get; set; }

        /// <summary>Display order within siblings.</summary>
        public int SortOrder { get; set; }

        /// <summary>Whether the category is currently selectable.</summary>
        public bool IsActive { get; set; } = true;

        public int? OrganizationId { get; set; }

        // Navigation
        public ProductCategory? ParentCategory { get; set; }
        public ICollection<ProductCategory> SubCategories { get; set; } = new List<ProductCategory>();
        public ICollection<Product> Products { get; set; } = new List<Product>();
    }
}
