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
    /// Student will pick up and pay at the canteen.
    /// </summary>
    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout()
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

        // Generate order number
        var orderNumber = $"#ORD{DateTime.UtcNow:yyMMdd}{new Random().Next(10, 99)}";

        var subtotal = cartItems.Sum(ci => ci.MenuItem.Price * ci.Quantity);

        var order = new Order
        {
            UserId = userId,
            OrderNumber = orderNumber,
            Status = "Pending",
            SubTotal = subtotal,
            TotalAmount = subtotal,
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

        // Notify the vendor(s) about the new order in background
        _ = Task.Run(async () =>
        {
            try
            {
                // Reload vendor IDs from captured data (cartItems are in memory)
                var vendorProfileIds = cartItems.Select(ci => ci.MenuItem.VendorProfileId).Distinct().ToList();

                // We need a fresh DB scope to look up vendor user IDs
                using var scope = HttpContext.RequestServices.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                foreach (var vProfileId in vendorProfileIds)
                {
                    var vendorUserId = await db.VendorProfiles
                        .Where(vp => vp.Id == vProfileId)
                        .Select(vp => vp.UserId)
                        .FirstOrDefaultAsync();

                    if (vendorUserId != 0)
                    {
                        await _pushNotificationService.SendNotificationAsync(
                            vendorUserId,
                            "🛎️ New Order Received!",
                            $"Order {orderNumber} is waiting for your confirmation.",
                            "/vendor/orders"
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                // Log but don't crash
                Console.WriteLine($"[PushNotif Error - Checkout] {ex.Message}");
            }
        });

        return Ok(new
        {
            message = "Order placed! The vendor has been notified. Please proceed to the canteen to pick up and pay.",
            order.Id,
            order.OrderNumber,
            order.TotalAmount,
            order.Status
        });
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

        // Notify the student about the order status in background
        _ = Task.Run(async () =>
        {
            try
            {
                await _pushNotificationService.SendNotificationAsync(
                    order.UserId,
                    "📦 Order Status Update",
                    statusMessage,
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
    /// Cancel an order (student can only cancel Pending orders).
    /// </summary>
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

        order.Status = "Cancelled";

        // Restore stock
        foreach (var item in order.OrderItems)
        {
            item.MenuItem.Stock += item.Quantity;
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Order cancelled." });
    }
}

// --- Request DTOs ---

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = string.Empty;
}
