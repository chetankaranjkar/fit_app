using System.Linq;
using GymManagement.Core.DTOs;
using GymManagement.Core.Exceptions;
using GymManagement.Core.Interfaces;
using GymManagement.Core.Services;
using GymManagement.Domain.Entities;
using GymManagement.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using EntityInvoiceStatus = GymManagement.Domain.Entities.InvoiceStatus;
using DtoInvoiceStatus = GymManagement.Core.DTOs.InvoiceStatus;

namespace GymManagement.Infrastructure.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly ApplicationDbContext _context;
        private readonly INotificationWebhookDispatcher _notificationWebhookDispatcher;

        public InvoiceService(
            IUnitOfWork unitOfWork,
            ApplicationDbContext context,
            INotificationWebhookDispatcher notificationWebhookDispatcher)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _notificationWebhookDispatcher = notificationWebhookDispatcher;
        }

        private IQueryable<Invoice> InvoicesWithIncludes() =>
            _context.Invoices
                .Include(i => i.InvoiceItems)
                .Include(i => i.UserMembership)
                    .ThenInclude(um => um.User)
                        .ThenInclude(u => u.AuthUser);

        public async Task<IEnumerable<InvoiceDto>> GetAllAsync()
        {
            var result = await InvoicesWithIncludes().ToListAsync();
            return result.Select(MapToDto);
        }

        public async Task<IEnumerable<InvoiceDto>> GetByMembershipIdAsync(int membershipId)
        {
            var result = await InvoicesWithIncludes()
                .Where(i => i.UserMembershipId == membershipId)
                .ToListAsync();
            return result.Select(MapToDto);
        }

        public async Task<IEnumerable<InvoiceDto>> GetByUserIdAsync(int userId)
        {
            var membershipIds = await _context.UserMemberships
                .Where(um => um.UserId == userId)
                .Select(um => um.Id)
                .ToListAsync();

            var result = await InvoicesWithIncludes()
                .Where(i => membershipIds.Contains(i.UserMembershipId))
                .ToListAsync();
            return result.Select(MapToDto);
        }

        public async Task<InvoiceDto?> GetByIdAsync(int id)
        {
            var invoice = await InvoicesWithIncludes()
                .FirstOrDefaultAsync(i => i.Id == id);

            return invoice == null ? null : MapToDto(invoice);
        }

        public async Task<InvoiceDto?> GetByNumberAsync(string invoiceNumber)
        {
            var invoice = await InvoicesWithIncludes()
                .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber);

            return invoice == null ? null : MapToDto(invoice);
        }

        public async Task<InvoiceDto> CreateAsync(CreateInvoiceDto dto)
        {
            var subtotal = dto.Items.Sum(item => item.Quantity * item.UnitPrice);
            var taxAmount = subtotal * dto.TaxRate;
            var totalAmount = subtotal + taxAmount - dto.DiscountAmount;
            const int maxAttempts = 3;
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var invoiceNumber = await GenerateInvoiceNumberAsync();
                var invoice = new Invoice
                {
                    InvoiceNumber = invoiceNumber,
                    UserMembershipId = dto.UserMembershipId,
                    IssueDate = dto.IssueDate,
                    DueDate = dto.DueDate,
                    Subtotal = subtotal,
                    TaxAmount = taxAmount,
                    DiscountAmount = dto.DiscountAmount,
                    TotalAmount = totalAmount,
                    Currency = "USD",
                    Notes = dto.Notes,
                    Status = EntityInvoiceStatus.Draft,
                    BillingAddress = dto.BillingAddress,
                    BillingCity = dto.BillingCity,
                    BillingState = dto.BillingState,
                    BillingZip = dto.BillingZip,
                    BillingCountry = dto.BillingCountry,
                    OrganizationId = await GetOrganizationIdFromMembershipAsync(dto.UserMembershipId),
                    InvoiceItems = dto.Items.Select(item => new InvoiceItem
                    {
                        Description = item.Description,
                        Quantity = item.Quantity,
                        Unit = item.Unit,
                        UnitPrice = item.UnitPrice,
                        Total = item.Quantity * item.UnitPrice,
                        Notes = item.Notes
                    }).ToList()
                };

                try
                {
                    await _unitOfWork.Invoices.AddAsync(invoice);
                    await _unitOfWork.SaveChangesAsync();
                    var createdInvoice = await GetByIdAsync(invoice.Id);
                    return createdInvoice ?? throw new Exception("Failed to create invoice");
                }
                catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex) && attempt < maxAttempts)
                {
                    _context.Entry(invoice).State = EntityState.Detached;
                    continue;
                }
            }

            throw new ConflictException("Failed to create invoice due to concurrent numbering collisions.");
        }

        public async Task<InvoiceDto?> UpdateAsync(int id, UpdateInvoiceDto dto)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(id);
            if (invoice == null) return null;

            if (dto.IssueDate.HasValue) invoice.IssueDate = dto.IssueDate.Value;
            if (dto.DueDate.HasValue) invoice.DueDate = dto.DueDate.Value;
            if (dto.PaidDate.HasValue) invoice.PaidDate = dto.PaidDate.Value;
            if (dto.Status.HasValue) invoice.Status = (EntityInvoiceStatus)dto.Status.Value;
            if (dto.DiscountAmount.HasValue) invoice.DiscountAmount = dto.DiscountAmount.Value;
            if (dto.Notes != null) invoice.Notes = dto.Notes;
            if (dto.BillingAddress != null) invoice.BillingAddress = dto.BillingAddress;
            if (dto.BillingCity != null) invoice.BillingCity = dto.BillingCity;
            if (dto.BillingState != null) invoice.BillingState = dto.BillingState;
            if (dto.BillingZip != null) invoice.BillingZip = dto.BillingZip;
            if (dto.BillingCountry != null) invoice.BillingCountry = dto.BillingCountry;
            if (dto.PaymentId.HasValue) invoice.PaymentId = dto.PaymentId;

            _unitOfWork.Invoices.Update(invoice);
            await _unitOfWork.SaveChangesAsync();

            return await GetByIdAsync(id);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(id);
            if (invoice == null) return false;

            _unitOfWork.Invoices.Delete(invoice);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<bool> MarkAsPaidAsync(int id, int paymentId)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(id);
            if (invoice == null) return false;

            invoice.Status = EntityInvoiceStatus.Paid;
            invoice.PaidDate = DateTime.UtcNow;
            invoice.PaymentId = paymentId;

            _unitOfWork.Invoices.Update(invoice);
            await _unitOfWork.SaveChangesAsync();
            return true;
        }

        public async Task<InvoiceDto?> GenerateInvoiceFromMembershipAsync(int membershipId, bool includeUnpaidOnly = true)
        {
            var membership = await _unitOfWork.UserMemberships.GetByIdAsync(membershipId);
            if (membership == null) return null;

            var existingInvoice = await _unitOfWork.Invoices.FindAsync(i =>
                i.UserMembershipId == membershipId &&
                i.Status != EntityInvoiceStatus.Cancelled);

            if (includeUnpaidOnly && existingInvoice.Any(i => i.Status != EntityInvoiceStatus.Paid && i.Status != EntityInvoiceStatus.Cancelled))
            {
                var unpaid = existingInvoice.FirstOrDefault(i => i.Status != EntityInvoiceStatus.Paid && i.Status != EntityInvoiceStatus.Cancelled);
                return unpaid == null ? null : await GetByIdAsync(unpaid.Id);
            }

            var plan = await _unitOfWork.MembershipPlans.GetByIdAsync(membership.PlanId);
            if (plan == null) return null;

            var createDto = new CreateInvoiceDto
            {
                UserMembershipId = membershipId,
                IssueDate = DateTime.UtcNow,
                DueDate = DateTime.UtcNow.AddDays(30),
                TaxRate = 0.10m,
                Items = new List<CreateInvoiceItemDto>
                {
                    new CreateInvoiceItemDto
                    {
                        Description = $"{plan.PlanName} - Monthly Fee",
                        Quantity = 1,
                        Unit = "month",
                        UnitPrice = plan.Price
                    }
                },
                Notes = $"Invoice for {plan.PlanName} membership"
            };

            return await CreateAsync(createDto);
        }

        public Task<string> ExportToPdfAsync(int id)
        {
            return Task.FromResult($"Invoices/{id}.pdf");
        }

        public async Task<Dictionary<int, int>> GetInvoiceIdsByPaymentIdsAsync(IEnumerable<int> paymentIds)
        {
            var ids = paymentIds.Distinct().ToList();
            if (ids.Count == 0)
                return new Dictionary<int, int>();

            var rows = await _context.Invoices.AsNoTracking()
                .Where(i => i.PaymentId.HasValue && ids.Contains(i.PaymentId.Value))
                .Select(i => new { PaymentId = i.PaymentId!.Value, i.Id })
                .ToListAsync();

            return rows
                .GroupBy(r => r.PaymentId)
                .ToDictionary(g => g.Key, g => g.Min(x => x.Id));
        }

        public async Task<InvoiceDto?> CreatePaidInvoiceForPaymentAsync(int paymentId)
        {
            var existing = await _context.Invoices.AsNoTracking()
                .FirstOrDefaultAsync(i => i.PaymentId == paymentId);
            if (existing != null)
                return await GetByIdAsync(existing.Id);

            var payment = await _context.Payments
                .Include(p => p.Membership)
                    .ThenInclude(m => m.Plan)
                .FirstOrDefaultAsync(p => p.Id == paymentId);

            if (payment?.Membership?.Plan == null)
                return null;

            var membership = payment.Membership;
            var plan = membership.Plan;
            var amount = payment.Amount;
            var paidInstant = payment.PaymentDate;
            if (paidInstant.Kind == DateTimeKind.Unspecified)
                paidInstant = DateTime.SpecifyKind(paidInstant, DateTimeKind.Utc);
            else
                paidInstant = paidInstant.ToUniversalTime();

            var receiptPart = string.IsNullOrWhiteSpace(payment.ReceiptNo)
                ? string.Empty
                : $" Receipt no. {payment.ReceiptNo}.";
            var notes = $"Payment received via {payment.PaymentMode}{receiptPart}".Trim();
            if (notes.Length > 1000)
                notes = notes[..1000];

            var lineTitle = $"Membership payment — {plan.PlanName}";
            if (lineTitle.Length > 200)
                lineTitle = lineTitle[..200];

            const int maxAttempts = 3;
            for (var attempt = 1; attempt <= maxAttempts; attempt++)
            {
                var invoiceNumber = await GenerateInvoiceNumberAsync();
                var invoice = new Invoice
                {
                    InvoiceNumber = invoiceNumber,
                    UserMembershipId = membership.Id,
                    IssueDate = paidInstant,
                    DueDate = paidInstant,
                    PaidDate = paidInstant,
                    Subtotal = amount,
                    TaxAmount = 0,
                    DiscountAmount = 0,
                    TotalAmount = amount,
                    Currency = "INR",
                    Notes = notes,
                    Status = EntityInvoiceStatus.Paid,
                    PaymentId = payment.Id,
                    OrganizationId = await GetOrganizationIdFromMembershipAsync(membership.Id),
                    InvoiceItems = new List<InvoiceItem>
                    {
                        new InvoiceItem
                        {
                            Description = lineTitle,
                            Quantity = 1,
                            Unit = "payment",
                            UnitPrice = amount,
                            Total = amount,
                            Notes = $"Mode: {payment.PaymentMode}"
                        }
                    }
                };

                try
                {
                    await _unitOfWork.Invoices.AddAsync(invoice);
                    await _unitOfWork.SaveChangesAsync();

                    var createdDto = await GetByIdAsync(invoice.Id);
                    if (createdDto != null)
                    {
                        await _notificationWebhookDispatcher.DispatchPaymentReceiptAsync(
                            new PaymentReceiptNotificationDto
                            {
                                InvoiceId = createdDto.Id,
                                InvoiceNumber = createdDto.InvoiceNumber,
                                PaymentId = payment.Id,
                                ReceiptNo = payment.ReceiptNo,
                                PaymentMode = payment.PaymentMode.ToString(),
                                PaymentDateUtc = paidInstant,
                                UserMembershipId = membership.Id,
                                CustomerName = createdDto.CustomerName,
                                CustomerEmail = createdDto.CustomerEmail,
                                TotalAmount = createdDto.TotalAmount,
                                Currency = createdDto.Currency ?? "INR",
                                PlanName = plan.PlanName,
                            }).ConfigureAwait(false);
                    }

                    return createdDto;
                }
                catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex) && attempt < maxAttempts)
                {
                    _context.Entry(invoice).State = EntityState.Detached;
                    continue;
                }
            }

            throw new ConflictException("Failed to create invoice due to concurrent numbering collisions.");
        }

        public async Task<byte[]> GeneratePdfBytesAsync(int id)
        {
            var invoice = await GetByIdAsync(id);
            if (invoice == null) throw new Exception("Invoice not found");

            // Required by QuestPDF in recent versions.
            QuestPDF.Settings.License = LicenseType.Community;

            var symbol = (invoice.Currency ?? "INR").ToUpperInvariant() switch
            {
                "INR" => "₹",
                "USD" => "$",
                _ => $"{invoice.Currency} "
            };

            return Document.Create(doc =>
            {
                doc.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(20);
                    page.DefaultTextStyle(x => x.FontSize(10.5f).FontColor(Colors.Grey.Darken4));

                    page.Header().Column(header =>
                    {
                        header.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Spacing(2);
                                left.Item().Row(brand =>
                                {
                                    brand.ConstantItem(34).Height(34).Background(Colors.Blue.Darken2).AlignCenter().AlignMiddle()
                                        .Text("GM").FontColor(Colors.White).SemiBold().FontSize(11);
                                    brand.RelativeItem().PaddingLeft(8).Column(text =>
                                    {
                                        text.Item().Text("Gym Management").FontSize(19).Bold().FontColor(Colors.Blue.Darken2);
                                        text.Item().Text("Invoice / Receipt").FontSize(11).SemiBold().FontColor(Colors.Grey.Darken1);
                                    });
                                });
                            });
                            row.RelativeItem().AlignRight().Column(right =>
                            {
                                right.Spacing(3);
                                right.Item().AlignRight().Text($"Invoice #{invoice.InvoiceNumber}")
                                    .FontSize(13).SemiBold().FontColor(Colors.Grey.Darken3);
                                right.Item().AlignRight().Text($"Status: {invoice.Status}")
                                    .FontSize(9).FontColor(StatusColor(invoice.Status));
                            });
                        });
                        header.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                    });
                    page.Background().AlignCenter().AlignMiddle().Rotate(-32).Text(
                        invoice.Status == DtoInvoiceStatus.Paid ? "ORIGINAL" : "DRAFT")
                        .FontSize(64)
                        .Bold()
                        .FontColor(Colors.Grey.Lighten3);

                    page.Content().Column(col =>
                    {
                        col.Spacing(12);

                        col.Item().Row(row =>
                        {
                            row.RelativeItem().Column(left =>
                            {
                                left.Spacing(2);
                                left.Item().Text("Bill To").SemiBold().FontColor(Colors.Grey.Darken2);
                                left.Item().Text(invoice.CustomerName ?? "N/A").FontSize(11).SemiBold();
                                left.Item().Text(invoice.CustomerEmail ?? "N/A");
                                var billingLine = BuildBillingLine(invoice);
                                if (!string.IsNullOrWhiteSpace(billingLine))
                                    left.Item().Text(billingLine!);
                            });
                            row.RelativeItem().Column(right =>
                            {
                                right.Spacing(3);
                                right.Item().AlignRight().Text($"Issue Date: {invoice.IssueDate:dd MMM yyyy}");
                                right.Item().AlignRight().Text($"Due Date: {invoice.DueDate:dd MMM yyyy}");
                                right.Item().AlignRight().Text(
                                    $"Paid Date: {(invoice.PaidDate.HasValue ? invoice.PaidDate.Value.ToString("dd MMM yyyy") : "—")}");
                                if (invoice.PaymentId.HasValue)
                                    right.Item().AlignRight().Text($"Payment Ref: #{invoice.PaymentId.Value}");
                            });
                        });

                        col.Item().Table(table =>
                        {
                            table.ColumnsDefinition(columns =>
                            {
                                columns.RelativeColumn(4);
                                columns.RelativeColumn(1);
                                columns.RelativeColumn(2);
                                columns.RelativeColumn(2);
                            });

                            table.Header(h =>
                            {
                                h.Cell().Element(CellHeader).Text("Description");
                                h.Cell().Element(CellHeader).AlignRight().Text("Qty");
                                h.Cell().Element(CellHeader).AlignRight().Text("Unit Price");
                                h.Cell().Element(CellHeader).AlignRight().Text("Amount");
                            });

                            foreach (var item in invoice.Items)
                            {
                                table.Cell().Element(CellBody).Text(item.Description);
                                table.Cell().Element(CellBody).AlignRight().Text(item.Quantity.ToString("0.##"));
                                table.Cell().Element(CellBody).AlignRight().Text($"{symbol}{item.UnitPrice:F2}");
                                table.Cell().Element(CellBody).AlignRight().Text($"{symbol}{item.Total:F2}");
                            }
                        });

                        col.Item().AlignRight().Width(220).Border(1).BorderColor(Colors.Grey.Lighten2).Padding(10).Column(summary =>
                        {
                            summary.Spacing(4);
                            summary.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Membership amount");
                                r.ConstantItem(100).AlignRight().Text($"{symbol}{invoice.Subtotal:F2}");
                            });
                            summary.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Tax");
                                r.ConstantItem(100).AlignRight().Text($"{symbol}{invoice.TaxAmount:F2}");
                            });
                            if (invoice.CouponDiscountAmount > 0)
                            {
                                summary.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("Coupon discount");
                                    r.ConstantItem(100).AlignRight().Text($"-{symbol}{invoice.CouponDiscountAmount:F2}");
                                });
                                if (!string.IsNullOrWhiteSpace(invoice.CouponCode))
                                {
                                    summary.Item().Text($"Coupon applied: {invoice.CouponCode}")
                                        .FontSize(9).FontColor(Colors.Grey.Darken1);
                                }
                            }
                            if (invoice.DiscountAmount > invoice.CouponDiscountAmount)
                            {
                                summary.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("Other discount");
                                    r.ConstantItem(100).AlignRight()
                                        .Text($"-{symbol}{(invoice.DiscountAmount - invoice.CouponDiscountAmount):F2}");
                                });
                            }
                            else if (invoice.CouponDiscountAmount <= 0 && invoice.DiscountAmount > 0)
                            {
                                summary.Item().Row(r =>
                                {
                                    r.RelativeItem().Text("Discount");
                                    r.ConstantItem(100).AlignRight().Text($"-{symbol}{invoice.DiscountAmount:F2}");
                                });
                            }
                            summary.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                            summary.Item().Row(r =>
                            {
                                r.RelativeItem().Text("Final bill amount").SemiBold();
                                r.ConstantItem(100).AlignRight().Text($"{symbol}{invoice.TotalAmount:F2}")
                                    .SemiBold();
                            });
                        });

                        if (!string.IsNullOrWhiteSpace(invoice.Notes))
                        {
                            col.Item().Border(1).BorderColor(Colors.Grey.Lighten2).Padding(8).Column(notes =>
                            {
                                notes.Item().Text("Notes").SemiBold().FontColor(Colors.Grey.Darken2);
                                notes.Item().Text(invoice.Notes);
                            });
                        }
                    });

                    page.Footer().Column(footer =>
                    {
                        footer.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                        footer.Item().PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem().Column(c =>
                            {
                                c.Item().Text("Gym Management Pvt. Ltd.").SemiBold().FontSize(9);
                                c.Item().Text("GSTIN: 00ABCDE1234F1Z5 • support@gym.local").FontSize(8.5f);
                                c.Item().Text("123 Fitness Street, Your City, India").FontSize(8.5f);
                            });
                            r.ConstantItem(160).Column(c =>
                            {
                                c.Item().AlignCenter().Text("Authorized Signatory").FontSize(8.5f).FontColor(Colors.Grey.Darken1);
                                c.Item().PaddingTop(14).LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
                            });
                        });
                        footer.Item().PaddingTop(6).Row(r =>
                        {
                            r.RelativeItem().Text("Generated by Gym Management")
                                .FontSize(9).FontColor(Colors.Grey.Darken1);
                            r.ConstantItem(120).AlignRight().Text(text =>
                            {
                                text.Span("Page ");
                                text.CurrentPageNumber();
                            });
                        });
                    });
                });
            }).GeneratePdf();
        }

        private async Task<string> GenerateInvoiceNumberAsync()
        {
            var conn = _context.Database.GetDbConnection();
            var shouldClose = conn.State != System.Data.ConnectionState.Open;
            if (shouldClose) await conn.OpenAsync();
            try
            {
                await using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT NEXT VALUE FOR [dbo].[InvoiceNumberSeq]";
                var result = await cmd.ExecuteScalarAsync();
                var sequence = Convert.ToInt64(result);
                var year = DateTime.UtcNow.Year;
                return $"INV-{year}-{sequence:D6}";
            }
            finally
            {
                if (shouldClose) await conn.CloseAsync();
            }
        }

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
            => ex.InnerException is SqlException sql &&
               (sql.Number == 2601 || sql.Number == 2627);

        private async Task<int?> GetOrganizationIdFromMembershipAsync(int membershipId)
        {
            var membership = await _unitOfWork.UserMemberships.GetByIdAsync(membershipId);
            var user = await _unitOfWork.Users.GetByIdAsync(membership?.UserId ?? 0);
            return user?.OrganizationId;
        }

        private static InvoiceDto MapToDto(Invoice invoice) => new()
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            UserMembershipId = invoice.UserMembershipId,
            CustomerName = invoice.UserMembership?.User != null
                ? $"{invoice.UserMembership.User.FirstName} {invoice.UserMembership.User.LastName}"
                : null,
            CustomerEmail = invoice.UserMembership?.User?.AuthUser?.Email,
            IssueDate = invoice.IssueDate,
            DueDate = invoice.DueDate,
            PaidDate = invoice.PaidDate,
            Subtotal = invoice.Subtotal,
            TaxAmount = invoice.TaxAmount,
            DiscountAmount = invoice.DiscountAmount,
            TotalAmount = invoice.TotalAmount,
            Currency = invoice.Currency ?? "USD",
            Notes = invoice.Notes,
            Status = (DtoInvoiceStatus)invoice.Status,
            BillingAddress = invoice.BillingAddress,
            BillingCity = invoice.BillingCity,
            BillingState = invoice.BillingState,
            BillingZip = invoice.BillingZip,
            BillingCountry = invoice.BillingCountry,
            PaymentId = invoice.PaymentId,
            Items = invoice.InvoiceItems.Select(item => new InvoiceItemDto
            {
                Id = item.Id,
                InvoiceId = item.InvoiceId,
                Description = item.Description,
                Quantity = item.Quantity,
                Unit = item.Unit,
                UnitPrice = item.UnitPrice,
                Total = item.Total,
                Notes = item.Notes
            }).ToList(),
            CreatedAt = invoice.CreatedDate,
            UpdatedAt = invoice.UpdatedDate
        };

        private static IContainer CellHeader(IContainer container) =>
            container
                .Background(Colors.Grey.Lighten4)
                .PaddingVertical(7)
                .PaddingHorizontal(8)
                .DefaultTextStyle(x => x.SemiBold());

        private static IContainer CellBody(IContainer container) =>
            container
                .BorderBottom(1)
                .BorderColor(Colors.Grey.Lighten3)
                .PaddingVertical(6)
                .PaddingHorizontal(8);

        private static string? BuildBillingLine(InvoiceDto invoice)
        {
            var parts = new[]
            {
                invoice.BillingAddress,
                invoice.BillingCity,
                invoice.BillingState,
                invoice.BillingZip,
                invoice.BillingCountry
            }.Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x!.Trim());
            var line = string.Join(", ", parts);
            return string.IsNullOrWhiteSpace(line) ? null : line;
        }

        private static string StatusColor(DtoInvoiceStatus status)
            => status switch
            {
                DtoInvoiceStatus.Paid => Colors.Green.Darken2,
                DtoInvoiceStatus.Overdue => Colors.Red.Darken2,
                DtoInvoiceStatus.Cancelled => Colors.Grey.Darken1,
                _ => Colors.Orange.Darken2
            };
    }
}
