using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using WebPush;
using System.Text.Json;

namespace SureserveAPI.Services;

public class PushNotificationService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PushNotificationService> _logger;

    public PushNotificationService(IServiceProvider serviceProvider, IConfiguration configuration, ILogger<PushNotificationService> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendNotificationAsync(int userId, string title, string body, string? url = null)
    {
        // Always use a fresh scope so this is safe to call from background Task.Run
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var subscriptions = await db.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (!subscriptions.Any())
        {
            _logger.LogWarning("No push subscriptions found for userId={UserId}", userId);
            return;
        }

        _logger.LogInformation("Sending push to userId={UserId}, found {Count} subscription(s)", userId, subscriptions.Count);

        // Get VAPID Keys from settings
        var publicKeySetting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VapidPublicKey");
        var privateKeySetting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VapidPrivateKey");

        if (publicKeySetting == null || privateKeySetting == null)
        {
            // Generate and save keys if not present
            var keys = VapidHelper.GenerateVapidKeys();

            if (publicKeySetting == null)
            {
                publicKeySetting = new Models.SystemSetting { Key = "VapidPublicKey", Value = keys.PublicKey, UpdatedAt = DateTime.UtcNow };
                db.SystemSettings.Add(publicKeySetting);
            }
            if (privateKeySetting == null)
            {
                privateKeySetting = new Models.SystemSetting { Key = "VapidPrivateKey", Value = keys.PrivateKey, UpdatedAt = DateTime.UtcNow };
                db.SystemSettings.Add(privateKeySetting);
            }
            await db.SaveChangesAsync();
        }

        var subject = _configuration["JwtSettings:Issuer"] ?? "mailto:admin@sureserve.edu";

        // Ensure subject is a valid URL or mailto:
        if (!subject.StartsWith("http") && !subject.StartsWith("mailto:"))
            subject = "mailto:admin@sureserve.edu";

        var vapidDetails = new VapidDetails(subject, publicKeySetting.Value, privateKeySetting.Value);
        var webPushClient = new WebPushClient();

        var payloadObj = new { title, body, url = url ?? "/" };
        var payload = JsonSerializer.Serialize(payloadObj);

        var toRemove = new List<Models.PushSubscription>();

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails);
                _logger.LogInformation("Push sent successfully to endpoint: {Endpoint}", sub.Endpoint[..Math.Min(40, sub.Endpoint.Length)]);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogWarning("Subscription expired (410/404), removing. Endpoint: {Endpoint}", sub.Endpoint[..Math.Min(40, sub.Endpoint.Length)]);
                toRemove.Add(sub);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send push notification to userId={UserId}", userId);
            }
        }

        if (toRemove.Any())
        {
            db.PushSubscriptions.RemoveRange(toRemove);
            await db.SaveChangesAsync();
        }
    }
}
