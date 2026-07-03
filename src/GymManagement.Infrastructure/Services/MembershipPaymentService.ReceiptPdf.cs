using GymManagement.Core.Exceptions;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace GymManagement.Infrastructure.Services;

public sealed partial class MembershipPaymentService
{
    public async Task<byte[]> GetReceiptPdfForTransactionAsync(
        int transactionId,
        CancellationToken cancellationToken = default)
    {
        var tx = await _db.MembershipPaymentTransactions.AsNoTracking()
            .Include(t => t.Payment)
            .ThenInclude(p => p.User)
            .Include(t => t.Payment)
            .ThenInclude(p => p.Membership)
            .ThenInclude(m => m.Plan)
            .FirstOrDefaultAsync(t => t.Id == transactionId && !t.IsDeleted, cancellationToken)
            ?? throw new NotFoundException("Payment transaction not found.");

        if (tx.Status != MembershipPaymentTransactionStatus.Completed)
            throw new BadRequestException("PDF receipts are only available for completed payments.");

        var branding = await LoadReceiptBrandingAsync(cancellationToken);
        var member = tx.Payment.User;
        var memberName = $"{member.FirstName} {member.LastName}".Trim();
        var planName = tx.Payment.Membership.Plan?.PlanName;
        var collectedBy = tx.CollectedByUserId.HasValue
            ? await _db.Users.AsNoTracking()
                .Where(u => u.Id == tx.CollectedByUserId.Value)
                .Select(u => (u.FirstName + " " + u.LastName).Trim())
                .FirstOrDefaultAsync(cancellationToken)
            : null;

        QuestPDF.Settings.License = LicenseType.Community;

        return Document.Create(doc =>
        {
            doc.Page(page =>
            {
                page.Size(PageSizes.A5);
                page.Margin(24);
                page.DefaultTextStyle(x => x.FontSize(10.5f).FontColor(Colors.Grey.Darken4));

                page.Header().Column(header =>
                {
                    header.Item().Row(row =>
                    {
                        row.RelativeItem().Column(left =>
                        {
                            left.Item().Row(brand =>
                            {
                                if (!string.IsNullOrWhiteSpace(branding.LogoFilePath))
                                {
                                    brand.ConstantItem(40).Height(40).Image(branding.LogoFilePath).FitArea();
                                }
                                else
                                {
                                    var initials = BuildInitials(branding.GymName);
                                    brand.ConstantItem(32).Height(32).Background(Colors.Blue.Darken2).AlignCenter().AlignMiddle()
                                        .Text(initials).FontColor(Colors.White).SemiBold().FontSize(10);
                                }
                                brand.RelativeItem().PaddingLeft(8).Column(text =>
                                {
                                    text.Item().Text(branding.GymName).FontSize(16).Bold().FontColor(Colors.Blue.Darken2);
                                    text.Item().Text("Payment receipt").FontSize(10).SemiBold().FontColor(Colors.Grey.Darken1);
                                });
                            });
                        });
                        row.ConstantItem(120).AlignRight().Column(right =>
                        {
                            right.Item().AlignRight().Text($"#{tx.ReceiptNumber}").FontSize(11).SemiBold();
                            right.Item().AlignRight().Text(tx.TransactionDate.ToString("dd MMM yyyy, HH:mm")).FontSize(9);
                        });
                    });
                    header.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                });

                page.Content().PaddingTop(12).Column(col =>
                {
                    col.Spacing(8);
                    col.Item().Text("Received from").SemiBold().FontColor(Colors.Grey.Darken2);
                    col.Item().Text(memberName).FontSize(12).Bold();
                    col.Item().Text($"Member ID: M-{member.Id}");

                    if (!string.IsNullOrWhiteSpace(planName))
                        col.Item().Text($"Plan: {planName}");

                    col.Item().PaddingTop(6).Background(Colors.Grey.Lighten4).Padding(10).Column(box =>
                    {
                        box.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Amount paid");
                            r.ConstantItem(100).AlignRight().Text($"₹{tx.TransactionAmount:N2}").Bold();
                        });
                        box.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text("Payment method");
                            r.ConstantItem(100).AlignRight().Text(tx.TransactionMethod.ToString());
                        });
                        box.Item().PaddingTop(4).Row(r =>
                        {
                            r.RelativeItem().Text("Remaining balance");
                            r.ConstantItem(100).AlignRight().Text($"₹{tx.Payment.PendingAmount:N2}");
                        });
                        if (!string.IsNullOrWhiteSpace(tx.ReferenceNumber))
                        {
                            box.Item().PaddingTop(4).Row(r =>
                            {
                                r.RelativeItem().Text("Reference");
                                r.ConstantItem(100).AlignRight().Text(tx.ReferenceNumber);
                            });
                        }
                    });

                    if (!string.IsNullOrWhiteSpace(collectedBy))
                        col.Item().Text($"Collected by: {collectedBy}").FontSize(9).FontColor(Colors.Grey.Darken1);

                    if (!string.IsNullOrWhiteSpace(tx.Remarks))
                        col.Item().Text($"Notes: {tx.Remarks}").FontSize(9).FontColor(Colors.Grey.Darken1);
                });

                page.Footer().AlignCenter().Text($"Thank you for your payment — {branding.GymName}")
                    .FontSize(9).FontColor(Colors.Grey.Darken1);
            });
        }).GeneratePdf();
    }

    private async Task<ReceiptPdfBranding> LoadReceiptBrandingAsync(CancellationToken ct)
    {
        var settings = await _db.GymSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, ct);
        var gymName = settings?.GymName?.Trim();
        if (string.IsNullOrWhiteSpace(gymName))
            gymName = settings?.EmailFromDisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(gymName))
        {
            var org = await _db.Organizations.AsNoTracking().OrderBy(o => o.Id).FirstOrDefaultAsync(ct);
            gymName = org?.Name?.Trim();
        }
        if (string.IsNullOrWhiteSpace(gymName))
            gymName = "Gym Management";

        var logoUrl = settings?.InvoiceLogoUrl?.Trim();
        if (string.IsNullOrWhiteSpace(logoUrl))
            logoUrl = settings?.GymLogoUrl?.Trim();

        return new ReceiptPdfBranding(gymName, _webRootPaths.MapToAbsolutePath(logoUrl));
    }

    private static string BuildInitials(string gymName)
    {
        var initials = new string(gymName
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w[0])
            .Take(2)
            .ToArray()).ToUpperInvariant();
        return string.IsNullOrWhiteSpace(initials) ? "GM" : initials;
    }

    private sealed record ReceiptPdfBranding(string GymName, string? LogoFilePath);
}
