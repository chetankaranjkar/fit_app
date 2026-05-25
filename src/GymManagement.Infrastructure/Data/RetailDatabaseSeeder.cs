using GymManagement.Domain.Entities;
using GymManagement.Domain.Entities.Retail;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GymManagement.Infrastructure.Data;

/// <summary>
/// Demo product categories and retail products for POS / inventory (idempotent by name + SKU).
/// </summary>
public static class RetailDatabaseSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context, ILogger? logger = null, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var org = await context.Organizations.AsNoTracking().FirstOrDefaultAsync(ct).ConfigureAwait(false);
        var orgId = org?.Id;

        var supplements = await EnsureCategoryAsync(context, "Supplements", null, 1, "Protein, pre-workout, vitamins", orgId, now, ct);
        var protein = await EnsureCategoryAsync(context, "Protein", supplements.Id, 1, "Whey, isolate, mass gainers", orgId, now, ct);
        var preWorkout = await EnsureCategoryAsync(context, "Pre-Workout", supplements.Id, 2, "Energy and focus blends", orgId, now, ct);
        var vitamins = await EnsureCategoryAsync(context, "Vitamins", supplements.Id, 3, "Daily health support", orgId, now, ct);

        var accessories = await EnsureCategoryAsync(context, "Accessories", null, 2, "Training accessories", orgId, now, ct);
        var gymGear = await EnsureCategoryAsync(context, "Gym Gear", accessories.Id, 1, "Bands, straps, bottles", orgId, now, ct);

        var apparel = await EnsureCategoryAsync(context, "Apparel", null, 3, "Gym wear", orgId, now, ct);
        var mensWear = await EnsureCategoryAsync(context, "Men's Wear", apparel.Id, 1, "Tees, shorts, tanks", orgId, now, ct);

        var products = new[]
        {
            ProductSeed("SUP-WHEY-1KG-CH", "Whey Protein 1kg", protein.Id, "MuscleFuel", "Chocolate", "1 kg", 2499m, 1699m, 1499m, 18m, 24, 8, "8901001001001"),
            ProductSeed("SUP-WHEY-1KG-VAN", "Whey Protein 1kg", protein.Id, "MuscleFuel", "Vanilla", "1 kg", 2499m, 1699m, 1499m, 18m, 18, 8, "8901001001002"),
            ProductSeed("SUP-ISO-2LB-UNF", "Whey Isolate 2lb", protein.Id, "PureLift", "Unflavored", "2 lb", 3299m, 2199m, 1999m, 18m, 12, 5, "8901001001003"),
            ProductSeed("SUP-CRE-300", "Creatine Monohydrate", protein.Id, "PureLift", null, "300 g", 899m, 499m, 449m, 12m, 30, 10, "8901001002001"),
            ProductSeed("SUP-PRE-250-FP", "Pre-Workout Energy", preWorkout.Id, "BlastZone", "Fruit Punch", "250 g", 1999m, 1199m, 999m, 18m, 15, 5, "8901001003001"),
            ProductSeed("SUP-PRE-30-SRV", "Pre-Workout RTD", preWorkout.Id, "BlastZone", "Blue Razz", "30 servings", 2499m, 1599m, 1399m, 18m, 10, 4, "8901001003002"),
            ProductSeed("SUP-MV-60", "Daily Multivitamin", vitamins.Id, "Wellness+", null, "60 tablets", 699m, 399m, 349m, 12m, 40, 12, "8901001004001"),
            ProductSeed("SUP-BCAA-400", "BCAA 2:1:1", vitamins.Id, "MuscleFuel", "Lemon", "400 g", 1499m, 899m, 799m, 18m, 14, 5, "8901001004002"),
            ProductSeed("ACC-RB-SET", "Resistance Bands Set", gymGear.Id, "FitPro", null, "5 bands", 1299m, 649m, 599m, 18m, 20, 6, "8902002001001"),
            ProductSeed("ACC-LS-01", "Lifting Straps Pair", gymGear.Id, "FitPro", null, "One size", 599m, 299m, 279m, 18m, 25, 8, "8902002001002"),
            ProductSeed("ACC-SHK-700", "Shaker Bottle 700ml", gymGear.Id, "HydraGym", "Black", "700 ml", 399m, 149m, 129m, 18m, 50, 15, "8902002001003"),
            ProductSeed("ACC-TWL-01", "Microfiber Gym Towel", gymGear.Id, "HydraGym", "Grey", null, 299m, 129m, 99m, 12m, 35, 10, "8902002001004"),
            ProductSeed("ACC-GLV-M", "Training Gloves", gymGear.Id, "FitPro", null, "M", 799m, 399m, 349m, 18m, 16, 5, "8902002001005"),
            ProductSeed("APP-TEE-M-BLK", "Men's Training Tee", mensWear.Id, "PulseFit", "Black", "M", 999m, 449m, 399m, 12m, 22, 6, "8903003001001"),
            ProductSeed("APP-TEE-L-NVY", "Men's Training Tee", mensWear.Id, "PulseFit", "Navy", "L", 999m, 449m, 399m, 12m, 18, 6, "8903003001002"),
            ProductSeed("APP-SHT-M-BLK", "Men's Training Shorts", mensWear.Id, "PulseFit", "Black", "M", 1299m, 599m, 549m, 12m, 15, 5, "8903003001003"),
            ProductSeed("APP-TANK-S-GRY", "Men's Tank Top", mensWear.Id, "PulseFit", "Grey", "S", 799m, 349m, 299m, 12m, 12, 4, "8903003001004"),
        };

        var inserted = 0;
        foreach (var p in products)
        {
            if (await context.RetailProducts.AnyAsync(x => x.Sku == p.Sku && !x.IsDeleted, ct).ConfigureAwait(false))
                continue;

            await context.RetailProducts.AddAsync(
                new Product
                {
                    Name = p.Name,
                    Description = p.Description,
                    Sku = p.Sku,
                    Barcode = p.Barcode,
                    CategoryId = p.CategoryId,
                    Brand = p.Brand,
                    Flavor = p.Flavor,
                    Size = p.Size,
                    Unit = p.Size,
                    GstPercent = p.GstPercent,
                    Mrp = p.Mrp,
                    PurchasePrice = p.PurchasePrice,
                    SellingPrice = p.SellingPrice,
                    StockQuantity = p.Stock,
                    LowStockThreshold = p.LowStockThreshold,
                    ExpiryDate = p.ExpiryDate,
                    Status = ProductStatus.Active,
                    OrganizationId = orgId,
                    CreatedDate = now,
                },
                ct).ConfigureAwait(false);
            inserted++;
        }

        if (inserted > 0)
            await context.SaveChangesAsync(ct).ConfigureAwait(false);

        logger?.LogInformation(
            "Retail seed: categories ready; {Inserted} new product(s) added ({Total} defined).",
            inserted,
            products.Length);
    }

    private static async Task<ProductCategory> EnsureCategoryAsync(
        ApplicationDbContext context,
        string name,
        int? parentId,
        int sortOrder,
        string? description,
        int? organizationId,
        DateTime now,
        CancellationToken ct)
    {
        var existing = await context.RetailProductCategories
            .FirstOrDefaultAsync(
                c => c.Name == name && c.ParentCategoryId == parentId && !c.IsDeleted,
                ct)
            .ConfigureAwait(false);

        if (existing != null)
            return existing;

        var category = new ProductCategory
        {
            Name = name,
            Description = description,
            ParentCategoryId = parentId,
            SortOrder = sortOrder,
            IsActive = true,
            OrganizationId = organizationId,
            CreatedDate = now,
        };
        await context.RetailProductCategories.AddAsync(category, ct).ConfigureAwait(false);
        await context.SaveChangesAsync(ct).ConfigureAwait(false);
        return category;
    }

    private static ProductSeedRow ProductSeed(
        string sku,
        string name,
        int categoryId,
        string brand,
        string? flavor,
        string? size,
        decimal mrp,
        decimal purchase,
        decimal selling,
        decimal gst,
        int stock,
        int lowStockThreshold,
        string? barcode,
        int monthsUntilExpiry = 18) =>
        new(
            sku,
            name,
            categoryId,
            brand,
            flavor,
            size,
            mrp,
            purchase,
            selling,
            gst,
            stock,
            lowStockThreshold,
            barcode,
            $"{name} — {brand}" + (flavor != null ? $" ({flavor})" : ""),
            DateTime.UtcNow.AddMonths(monthsUntilExpiry));

    private sealed record ProductSeedRow(
        string Sku,
        string Name,
        int CategoryId,
        string Brand,
        string? Flavor,
        string? Size,
        decimal Mrp,
        decimal PurchasePrice,
        decimal SellingPrice,
        decimal GstPercent,
        int Stock,
        int LowStockThreshold,
        string? Barcode,
        string Description,
        DateTime? ExpiryDate);
}
