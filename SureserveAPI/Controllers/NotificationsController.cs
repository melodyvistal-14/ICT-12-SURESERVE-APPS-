using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SureserveAPI.Data;
using SureserveAPI.Services;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;

    public NotificationsController(AppDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    /// <summary>
    /// Returns the VAPID public key so the frontend can subscribe.
    /// </summary>
    [HttpGet("vapid-public-key")]
    public IActionResult GetVapidPublicKey()
    {
        var key = _config["Vapid:PublicKey"] ?? "";
        return Ok(new { publicKey = key });
    }

    /// <summary>
    /// Save or update the logged-in user's push subscription.
    /// </summary>
    [HttpPost("subscribe")]
    [Authorize]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var existing = _context.PushSubscriptions
            .FirstOrDefault(ps => ps.UserId == userId);

        if (existing != null)
        {
            existing.Endpoint = request.Endpoint;
            existing.P256dh = request.P256dh;
            existing.Auth = request.Auth;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.PushSubscriptions.Add(new Models.PushSubscription
            {
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Subscribed to push notifications." });
    }

    /// <summary>
    /// Remove subscription on logout.
    /// </summary>
    [HttpDelete("unsubscribe")]
    [Authorize]
    public async Task<IActionResult> Unsubscribe()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var subs = _context.PushSubscriptions.Where(ps => ps.UserId == userId).ToList();
        _context.PushSubscriptions.RemoveRange(subs);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Unsubscribed." });
    }
}

public class SubscribeRequest
{
    public string Endpoint { get; set; } = string.Empty;
    public string P256dh { get; set; } = string.Empty;
    public string Auth { get; set; } = string.Empty;
}
