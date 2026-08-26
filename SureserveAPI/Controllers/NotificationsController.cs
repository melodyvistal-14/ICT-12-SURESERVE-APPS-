using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;

    public NotificationsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("vapid-public-key")]
    [AllowAnonymous]
    public async Task<IActionResult> GetVapidPublicKey()
    {
        var publicKeySetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VapidPublicKey");
        if (publicKeySetting == null)
        {
            var keys = WebPush.VapidHelper.GenerateVapidKeys();
            publicKeySetting = new SystemSetting { Key = "VapidPublicKey", Value = keys.PublicKey, UpdatedAt = DateTime.UtcNow };
            var privateKeySetting = new SystemSetting { Key = "VapidPrivateKey", Value = keys.PrivateKey, UpdatedAt = DateTime.UtcNow };
            _context.SystemSettings.AddRange(publicKeySetting, privateKeySetting);
            await _context.SaveChangesAsync();
        }
        return Ok(new { publicKey = publicKeySetting.Value });
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscriptionRequest request)
    {
        var userId = GetUserId();

        // Check if subscription already exists for this endpoint
        var existing = await _context.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint && s.UserId == userId);

        if (existing == null)
        {
            var sub = new PushSubscription
            {
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth
            };
            _context.PushSubscriptions.Add(sub);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Subscribed successfully." });
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
    {
        var userId = GetUserId();
        var existing = await _context.PushSubscriptions
            .FirstOrDefaultAsync(s => s.Endpoint == request.Endpoint && s.UserId == userId);

        if (existing != null)
        {
            _context.PushSubscriptions.Remove(existing);
            await _context.SaveChangesAsync();
        }

        return Ok(new { message = "Unsubscribed successfully." });
    }
}

public class SubscriptionRequest
{
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
}

public class UnsubscribeRequest
{
    public string Endpoint { get; set; } = string.Empty;
}
