using GymManagement.Core.DTOs;
using GymManagement.Core.Services;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Logging;
using MimeKit;

namespace GymManagement.Infrastructure.Services.Notifications;

/// <summary>Low-level SMTP transport extracted from OutboundEmailService (single send path).</summary>
public sealed class EmailTransportService : IEmailTransportService
{
    private readonly IEmailSettingsService _settings;
    private readonly ILogger<EmailTransportService> _logger;

    public EmailTransportService(IEmailSettingsService settings, ILogger<EmailTransportService> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task SendAsync(
        string to,
        string subject,
        string textBody,
        string? htmlBody,
        IReadOnlyList<string>? attachmentPaths,
        CancellationToken ct = default)
    {
        var cfg = await _settings.GetSmtpConfigAsync(ct);
        if (!cfg.IsConfigured)
            throw new InvalidOperationException("Email is not configured. Save SMTP settings first.");

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(cfg.FromDisplayName ?? cfg.FromAddress, cfg.FromAddress));
        message.To.Add(MailboxAddress.Parse(to.Trim()));
        message.Subject = subject;

        var builder = new BodyBuilder { TextBody = textBody };
        if (!string.IsNullOrWhiteSpace(htmlBody))
            builder.HtmlBody = htmlBody;

        if (attachmentPaths != null)
        {
            foreach (var path in attachmentPaths.Where(p => !string.IsNullOrWhiteSpace(p) && File.Exists(p)))
            {
                await builder.Attachments.AddAsync(path, ct);
            }
        }

        message.Body = builder.ToMessageBody();

        using var client = new SmtpClient();
        var secureSocket = cfg.UseStartTls ? SecureSocketOptions.StartTls : SecureSocketOptions.Auto;
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await client.ConnectAsync(cfg.Host, cfg.Port, secureSocket, ct);
        await client.AuthenticateAsync(cfg.Username, cfg.Password, ct);
        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);
        sw.Stop();
        _logger.LogInformation(
            "Email sent to {Recipient} in {DurationMs}ms via {Host}.",
            to.Trim(),
            sw.ElapsedMilliseconds,
            cfg.Host);
    }
}
