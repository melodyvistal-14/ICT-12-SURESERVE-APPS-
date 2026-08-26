using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using WebPush;
using System.Text.Json;

namespace SureserveAPI.Services;

public class PushNotificationService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public PushNotificationService(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task SendNotificationAsync(int userId, string title, string body, string? url = null)
    {
        var subscriptions = await _context.PushSubscriptions
            .Where(s => s.UserId == userId)
            .ToListAsync();

        if (!subscriptions.Any()) return;

        // Get VAPID Keys from settings
        var publicKeySetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VapidPublicKey");
        var privateKeySetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VapidPrivateKey");

        if (publicKeySetting == null || privateKeySetting == null)
        {
            // Generate and save keys if not present
            var keys = VapidHelper.GenerateVapidKeys();
            
            if (publicKeySetting == null)
            {
                publicKeySetting = new Models.SystemSetting { Key = "VapidPublicKey", Value = keys.PublicKey, UpdatedAt = DateTime.UtcNow };
                _context.SystemSettings.Add(publicKeySetting);
            }
            if (privateKeySetting == null)
            {
                privateKeySetting = new Models.SystemSetting { Key = "VapidPrivateKey", Value = keys.PrivateKey, UpdatedAt = DateTime.UtcNow };
                _context.SystemSettings.Add(privateKeySetting);
            }
            await _context.SaveChangesAsync();
        }

        var subject = _configuration["JwtSettings:Issuer"] ?? "mailto:admin@sureserve.edu";
        var vapidDetails = new VapidDetails(subject, publicKeySetting.Value, privateKeySetting.Value);
        var webPushClient = new WebPushClient();

        var payloadObj = new { title, body, url = url ?? "/" };
        var payload = JsonSerializer.Serialize(payloadObj);

        foreach (var sub in subscriptions)
        {
            try
            {
                var pushSubscription = new WebPush.PushSubscription(sub.Endpoint, sub.P256dh, sub.Auth);
                await webPushClient.SendNotificationAsync(pushSubscription, payload, vapidDetails);
            }
            catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone || ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // Subscription is no longer valid, delete it
                _context.PushSubscriptions.Remove(sub);
            }
            catch (Exception)
            {
                // Log or ignore other errors to avoid blocking
            }
        }
        await _context.SaveChangesAsync();
    }
}
