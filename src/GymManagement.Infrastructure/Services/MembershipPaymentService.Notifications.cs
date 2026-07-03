using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GymManagement.Infrastructure.Services;

public sealed partial class MembershipPaymentService
{
    public async Task<SendPaymentReceiptResultDto> SendPaymentReceiptForTransactionAsync(
        int transactionId,
        string channel,
        CancellationToken cancellationToken = default)
    {
        var tx = await _db.MembershipPaymentTransactions.AsNoTracking()
            .Include(t => t.Payment)
            .ThenInclude(p => p.Membership)
            .ThenInclude(m => m.Plan)
            .Include(t => t.Payment)
            .ThenInclude(p => p.Membership)
            .ThenInclude(m => m.User)
            .ThenInclude(u => u.AuthUser)
            .FirstOrDefaultAsync(t => t.Id == transactionId && !t.IsDeleted, cancellationToken);

        if (tx == null)
            throw new NotFoundException("Payment transaction not found.");

        if (tx.Status != MembershipPaymentTransactionStatus.Completed)
            throw new BadRequestException("Receipt notifications can only be sent for completed payments.");

        var header = tx.Payment;
        var membership = header.Membership;
        var user = membership.User;
        var dto = new PaymentReceiptNotificationDto
        {
            InvoiceId = header.InvoiceId ?? 0,
            InvoiceNumber = header.InvoiceNumber ?? header.PaymentNumber,
            PaymentId = tx.Id,
            ReceiptNo = tx.ReceiptNumber,
            PaymentMode = tx.TransactionMethod.ToString(),
            PaymentDateUtc = tx.TransactionDate,
            UserMembershipId = membership.Id,
            UserId = user.Id,
            CustomerName = $"{user.FirstName} {user.LastName}".Trim(),
            CustomerEmail = user.AuthUser?.Email,
            MemberPhone = user.Phone,
            TotalAmount = tx.TransactionAmount,
            Currency = "INR",
            PlanName = membership.Plan?.PlanName,
            AttachmentPaths = await TryCreateInvoiceAttachmentAsync(header.InvoiceId, cancellationToken),
        };

        return await _notificationDispatcher.SendPaymentReceiptManualAsync(dto, channel, cancellationToken);
    }

    public async Task<SendPaymentReceiptResultDto> SendPaymentDueReminderForMembershipPaymentAsync(
        int membershipPaymentId,
        string channel,
        CancellationToken cancellationToken = default)
    {
        var header = await _db.MembershipPayments.AsNoTracking()
            .Include(p => p.Membership)
            .ThenInclude(m => m.Plan)
            .Include(p => p.Membership)
            .ThenInclude(m => m.User)
            .ThenInclude(u => u.AuthUser)
            .FirstOrDefaultAsync(p => p.Id == membershipPaymentId && !p.IsDeleted, cancellationToken);

        if (header == null)
            throw new NotFoundException("Payment record not found.");

        if (header.PendingAmount <= 0.02m)
            throw new BadRequestException("This membership has no outstanding balance.");

        var user = header.Membership.User;
        var dto = new PaymentDueReminderNotificationDto
        {
            MembershipPaymentId = header.Id,
            UserId = user.Id,
            CustomerName = $"{user.FirstName} {user.LastName}".Trim(),
            CustomerEmail = user.AuthUser?.Email,
            MemberPhone = user.Phone,
            InvoiceNumber = header.InvoiceNumber ?? header.PaymentNumber,
            PendingAmount = header.PendingAmount,
            NextDueDateUtc = header.NextDueDate,
            PlanName = header.Membership.Plan?.PlanName,
        };

        var result = await _notificationDispatcher.SendPaymentDueReminderManualAsync(dto, channel, cancellationToken);

        if ((result.Email.Sent || result.Sms.Sent))
            await MarkReminderSentAsync(membershipPaymentId, cancellationToken);

        return result;
    }

    private async Task<IReadOnlyList<string>?> TryCreateInvoiceAttachmentAsync(int? invoiceId, CancellationToken ct)
    {
        if (!invoiceId.HasValue || invoiceId.Value <= 0)
            return null;

        try
        {
            var bytes = await _invoiceService.GeneratePdfBytesAsync(invoiceId.Value);
            var path = Path.Combine(Path.GetTempPath(), $"gym-invoice-{invoiceId.Value}-{Guid.NewGuid():N}.pdf");
            await File.WriteAllBytesAsync(path, bytes, ct);
            return new[] { path };
        }
        catch
        {
            return null;
        }
    }
}
