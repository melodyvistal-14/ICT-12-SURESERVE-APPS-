using WebPush;

namespace SureserveAPI.Services;

public class PushNotificationService
{
    private readonly string _vapidPublicKey;
    private readonly string _vapidPrivateKey;
    private readonly string _vapidSubject;

    public PushNotificationService(IConfiguration config)
    {
        _vapidPublicKey = config["Vapid:PublicKey"] ?? "";
        _vapidPrivateKey = config["Vapid:PrivateKey"] ?? "";
        _vapidSubject = config["Vapid:Subject"] ?? "mailto:admin@sureserve.edu";
    }

    public async Task SendNotificationAsync(string endpoint, string p256dh, string auth, string title, string body, string? icon = null)
    {
        if (string.IsNullOrWhiteSpace(_vapidPublicKey) || string.IsNullOrWhiteSpace(_vapidPrivateKey))
            return;

        try
        {
            var subscription = new PushSubscription(endpoint, p256dh, auth);
            var vapidDetails = new VapidDetails(_vapidSubject, _vapidPublicKey, _vapidPrivateKey);
            var client = new WebPushClient();

            var payload = System.Text.Json.JsonSerializer.Serialize(new
            {
                title,
                body,
                icon = icon ?? "/icon-192.png",
                badge = "/icon-192.png"
            });

            await client.SendNotificationAsync(subscription, payload, vapidDetails);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PushNotification] Failed to send: {ex.Message}");
        }
    }
}
