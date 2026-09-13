using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;
using SureserveAPI.Services;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PushNotificationService _pushNotificationService;

    public OrdersController(AppDbContext context, PushNotificationService pushNotificationService)
    {
        _context = context;
        _pushNotificationService = pushNotificationService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get current user's orders with optional status filter.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetOrders([FromQuery] string? status)
    {
        var userId = GetUserId();

        var query = _context.Orders
            .Include(o => o.OrderItems)
            .Where(o => o.UserId == userId);

        if (!string.IsNullOrEmpty(status))
        {
            query = status.ToLower() switch
            {
                "upcoming" => query.Where(o => o.Status == "Pending" || o.Status == "Preparing" || o.Status == "Ready"),
                "completed" => query.Where(o => o.Status == "Completed"),
                "cancelled" => query.Where(o => o.Status == "Cancelled"),
                _ => query.Where(o => o.Status == status)
            };
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.Status,
                o.TotalAmount,
                o.CreatedAt,
                ItemCount = o.OrderItems.Sum(oi => oi.Quantity),
                Items = o.OrderItems.Select(oi => new
                {
                    oi.ItemName,
                    oi.Price,
                    oi.Quantity
                })
            })
            .ToListAsync();

        return Ok(orders);
    }

    /// <summary>
    /// Get order details by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(int id)
    {
        var userId = GetUserId();

        var order = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .Where(o => o.Id == id && o.UserId == userId)
            .Select(o => new
            {
                o.Id,
                o.OrderNumber,
                o.Status,
                o.SubTotal,
                o.TotalAmount,
                o.CreatedAt,
                Items = o.OrderItems.Select(oi => new
                {
                    oi.ItemName,
                    oi.Price,
                    oi.Quantity,
                    oi.MenuItem.ImageUrl
                })
            })
            .FirstOrDefaultAsync();

        if (order == null)
            return NotFound(new { message = "Order not found." });

        return Ok(order);
    }

    /// <summary>
    /// Place an order from the cart. Notifies the vendor.
    /// Supports both pickup and delivery options.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout([FromBody] CheckoutRequest request)
    {
        var userId = GetUserId();

        var cartItems = await _context.CartItems
            .Include(ci => ci.MenuItem)
            .Where(ci => ci.UserId == userId)
            .ToListAsync();

        if (!cartItems.Any())
            return BadRequest(new { message = "Cart is empty." });

        // Validate all items are still available
        var unavailable = cartItems.Where(ci => !ci.MenuItem.IsAvailable).ToList();
        if (unavailable.Any())
            return BadRequest(new { message = $"Some items are no longer available: {string.Join(", ", unavailable.Select(ci => ci.MenuItem.Name))}" });

        // Validate delivery requirements
        if (string.Equals(request.DeliveryType, "Delivery", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(request.Building) || string.IsNullOrWhiteSpace(request.Room) || string.IsNullOrWhiteSpace(request.Section))
            {
                return BadRequest(new { message = "Building, Room, and Section are required for delivery orders." });
            }
        }

        // Generate order number
        var orderNumber = $"#ORD{DateTime.UtcNow:yyMMdd}{new Random().Next(10, 99)}";

        var subtotal = cartItems.Sum(ci => ci.MenuItem.Price * ci.Quantity);

        // Calculate delivery fee based on building
        decimal deliveryFee = 0m;
        if (string.Equals(request.DeliveryType, "Delivery", StringComparison.OrdinalIgnoreCase))
        {
            deliveryFee = CalculateDeliveryFee(request.DistanceMeters, request.Building);
        }

        var totalAmount = subtotal + deliveryFee;

        var order = new Order
        {
            UserId = userId,
            OrderNumber = orderNumber,
            Status = "Pending",
            SubTotal = subtotal,
            TotalAmount = totalAmount,
            DeliveryType = request.DeliveryType ?? "Pickup",
            DeliveryFee = deliveryFee,
            Building = request.Building ?? string.Empty,
            Room = request.Room ?? string.Empty,
            Section = request.Section ?? string.Empty,
            OrderItems = cartItems.Select(ci => new OrderItem
            {
                MenuItemId = ci.MenuItemId,
                ItemName = ci.MenuItem.Name,
                Price = ci.MenuItem.Price,
                Quantity = ci.Quantity
            }).ToList()
        };

        _context.Orders.Add(order);

        // Clear the cart
        _context.CartItems.RemoveRange(cartItems);

        // Decrease stock
        foreach (var ci in cartItems)
        {
            ci.MenuItem.Stock = Math.Max(0, ci.MenuItem.Stock - ci.Quantity);
            if (ci.MenuItem.Stock == 0)
            {
                ci.MenuItem.IsAvailable = false;
            }
        }

        await _context.SaveChangesAsync();

        // 1. Fetch vendor User IDs BEFORE the background task (fixes HttpContext disposed error)
        var vendorProfileIds = cartItems.Select(ci => ci.MenuItem.VendorProfileId).Distinct().ToList();
        var vendorUserIds = await _context.VendorProfiles
            .Where(vp => vendorProfileIds.Contains(vp.Id))
            .Select(vp => vp.UserId)
            .ToListAsync();

        var timeString = DateTime.Now.ToString("h:mm tt");

        // 2. Notify the vendor(s) about the new order in background
        _ = Task.Run(async () =>
        {
            foreach (var vendorUserId in vendorUserIds)
            {
                if (vendorUserId != 0)
                {
                    try
                    {
                        var deliveryInfo = string.Equals(request.DeliveryType, "Delivery", StringComparison.OrdinalIgnoreCase)
                            ? $" (Delivery to {request.Building}, Room {request.Room})"
                            : " (Pickup)";

                        await _pushNotificationService.SendNotificationAsync(
                            vendorUserId,
                            "🛎️ New Order Received!",
                            $"Order {orderNumber} is waiting for your confirmation. ({timeString}){deliveryInfo}",
                            "/vendor/orders"
                        );
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[PushNotif Error - Checkout] {ex.Message}");
                    }
                }
            }
        });

        var message = string.Equals(request.DeliveryType, "Delivery", StringComparison.OrdinalIgnoreCase)
            ? $"Order placed! The vendor has been notified. Your order will be delivered to {request.Building}, Room {request.Room}. Delivery fee: ₱{deliveryFee:F2}"
            : "Order placed! The vendor has been notified. Please proceed to the canteen to pick up and pay.";

        return Ok(new
        {
            message,
            order.Id,
            order.OrderNumber,
            order.TotalAmount,
            order.DeliveryFee,
            order.DeliveryType,
            order.Status
        });
    }

    private static decimal CalculateDeliveryFee(int? distanceMeters, string? building)
    {
        // Distance-based fee: ₱5 base + ₱2 per 100m, min ₱5, max ₱50
        if (distanceMeters.HasValue && distanceMeters.Value > 0)
        {
            var fee = 5m + (decimal)Math.Ceiling(distanceMeters.Value / 100.0) * 2m;
            return Math.Min(Math.Max(fee, 5m), 50m);
        }

        // Fallback: building-name based fee if no GPS data provided
        return (building?.ToLower() ?? string.Empty) switch
        {
            "main building" or "building a" => 10m,
            "science building" or "building b" => 15m,
            "arts building" or "building c" => 12m,
            "sports complex" or "gym" => 20m,
            "annex" or "building d" => 18m,
            _ => 15m
        };
    }

    /// <summary>
    /// Update order status (Vendor only).
    /// Flow: Pending → Preparing → Ready → Completed
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _context.Orders
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null)
            return NotFound(new { message = "Order not found." });

        var validStatuses = new[] { "Pending", "Preparing", "Ready", "Completed", "Cancelled" };
        if (!validStatuses.Contains(request.Status))
            return BadRequest(new { message = $"Invalid status. Valid values: {string.Join(", ", validStatuses)}" });

        order.Status = request.Status;
        await _context.SaveChangesAsync();

        // Status messages for the student
        var statusMessage = request.Status switch
        {
            "Preparing" => $"Your order {order.OrderNumber} is now being prepared!",
            "Ready" => $"Your order {order.OrderNumber} is ready! Please go to the canteen to pick up and pay.",
            "Completed" => $"Your order {order.OrderNumber} has been completed. Thank you!",
            "Cancelled" => $"Your order {order.OrderNumber} has been cancelled.",
            _ => $"Order status updated to {request.Status}."
        };

        var timeString = DateTime.Now.ToString("h:mm tt");
        var bodyMessage = $"{statusMessage} ({timeString})";

        // Notify the student about the order status in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _pushNotificationService.SendNotificationAsync(
                    order.UserId,
                    "📦 Order Status Update",
                    bodyMessage,
                    "/orders"
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PushNotif Error - Status] {ex.Message}");
            }
        });

        return Ok(new
        {
            message = statusMessage,
            order.Id,
            order.OrderNumber,
            order.Status
        });
    }

    /// <summary>
    /// Get current user's cancellation status and remaining cancellations.
    /// </summary>
    [HttpGet("cancellation-status")]
    public async Task<IActionResult> GetCancellationStatus()
    {
        var userId = GetUserId();

        var cancellationTracking = await _context.UserCancellationTrackings
            .FirstOrDefaultAsync(uct => uct.UserId == userId);

        if (cancellationTracking == null)
        {
            return Ok(new
            {
                cancellationCount = 0,
                cancellationsRemaining = 3,
                isBlocked = false,
                blockExpiryDate = (DateTime?)null
            });
        }

        // Check if user is currently blocked
        var isBlocked = cancellationTracking.BlockExpiryDate.HasValue && cancellationTracking.BlockExpiryDate.Value > DateTime.UtcNow;

        // Reset count if it's a new day and not blocked
        if (!isBlocked && cancellationTracking.LastResetDate.Date != DateTime.UtcNow.Date)
        {
            cancellationTracking.CancellationCount = 0;
            cancellationTracking.LastResetDate = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        var cancellationsRemaining = isBlocked ? 0 : 3 - cancellationTracking.CancellationCount;

        return Ok(new
        {
            cancellationCount = cancellationTracking.CancellationCount,
            cancellationsRemaining = cancellationsRemaining,
            isBlocked = isBlocked,
            blockExpiryDate = cancellationTracking.BlockExpiryDate
        });
    }

    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(int id)
    {
        var userId = GetUserId();
        var order = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

        if (order == null)
            return NotFound(new { message = "Order not found." });

        if (order.Status != "Pending")
            return BadRequest(new { message = "Only pending orders can be cancelled." });

        // Get or create cancellation tracking for this user
        var cancellationTracking = await _context.UserCancellationTrackings
            .FirstOrDefaultAsync(uct => uct.UserId == userId);

        if (cancellationTracking == null)
        {
            cancellationTracking = new UserCancellationTracking
            {
                UserId = userId,
                CancellationCount = 0,
                LastResetDate = DateTime.UtcNow
            };
            _context.UserCancellationTrackings.Add(cancellationTracking);
        }

        // Check if user is currently blocked
        if (cancellationTracking.BlockExpiryDate.HasValue && cancellationTracking.BlockExpiryDate.Value > DateTime.UtcNow)
        {
            var remainingTime = cancellationTracking.BlockExpiryDate.Value - DateTime.UtcNow;
            return BadRequest(new
            {
                message = $"You have exceeded your cancellation limit. You are blocked from cancelling orders for {remainingTime.Hours} hours and {remainingTime.Minutes} minutes.",
                isBlocked = true,
                blockExpiryDate = cancellationTracking.BlockExpiryDate
            });
        }

        // Reset count if it's a new day
        if (cancellationTracking.LastResetDate.Date != DateTime.UtcNow.Date)
        {
            cancellationTracking.CancellationCount = 0;
            cancellationTracking.LastResetDate = DateTime.UtcNow;
        }

        // Check if user has exceeded the 3-cancellation limit
        if (cancellationTracking.CancellationCount >= 3)
        {
            // Block the user for 1 day
            cancellationTracking.BlockExpiryDate = DateTime.UtcNow.AddDays(1);
            await _context.SaveChangesAsync();

            return BadRequest(new
            {
                message = "You have exceeded your daily cancellation limit (3). You are now blocked from cancelling orders for 24 hours.",
                isBlocked = true,
                blockExpiryDate = cancellationTracking.BlockExpiryDate,
                cancellationLimitReached = true
            });
        }

        order.Status = "Cancelled";

        // Restore stock
        foreach (var item in order.OrderItems)
        {
            item.MenuItem.Stock += item.Quantity;
        }

        // Increment cancellation count
        cancellationTracking.CancellationCount++;

        await _context.SaveChangesAsync();

        var cancellationsRemaining = 3 - cancellationTracking.CancellationCount;

        return Ok(new
        {
            message = "Order cancelled.",
            cancelledCount = cancellationTracking.CancellationCount,
            cancellationsRemaining = cancellationsRemaining,
            isBlocked = false
        });
    }
}

// --- Request DTOs ---

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}

public class CheckoutRequest
{
    public string? DeliveryType { get; set; } = "Pickup"; // Pickup or Delivery
    public string? Building { get; set; }
    public string? Room { get; set; }
    public string? Section { get; set; }
    public int? DistanceMeters { get; set; } // GPS distance in meters from canteen to delivery location
}
