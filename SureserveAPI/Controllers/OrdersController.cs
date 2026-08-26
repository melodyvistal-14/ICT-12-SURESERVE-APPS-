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
    private readonly PushNotificationService _push;

    public OrdersController(AppDbContext context, PushNotificationService push)
    {
        _context = context;
        _push = push;
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

        // Notify all vendors about the new order
        var vendorSubs = _context.PushSubscriptions
            .Where(ps => _context.Users.Any(u => u.Id == ps.UserId && u.Role == "Vendor"))
            .ToList();

        foreach (var sub in vendorSubs)
        {
            _ = _push.SendNotificationAsync(
                sub.Endpoint, sub.P256dh, sub.Auth,
                "🛒 New Order Received!",
                $"Order {orderNumber} just came in. Tap to view."
            );
        }

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

        // Notify the student who placed the order
        var studentSub = _context.PushSubscriptions
            .FirstOrDefault(ps => ps.UserId == order.UserId);

        if (studentSub != null)
        {
            var (notifTitle, notifBody) = request.Status switch
            {
                "Preparing" => ("🍳 Order Being Prepared!", $"Your order {order.OrderNumber} is now being prepared!"),
                "Ready"     => ("✅ Order Ready for Pickup!", $"Your order {order.OrderNumber} is ready! Go to the canteen."),
                "Completed" => ("🎉 Order Completed!", $"Your order {order.OrderNumber} is done. Thank you!"),
                "Cancelled" => ("❌ Order Cancelled", $"Your order {order.OrderNumber} has been cancelled."),
                _           => ("📦 Order Update", $"Order {order.OrderNumber} is now {request.Status}.")
            };
            _ = _push.SendNotificationAsync(studentSub.Endpoint, studentSub.P256dh, studentSub.Auth, notifTitle, notifBody);
        }

        // Status messages for the student
        var statusMessage = request.Status switch
        {
            "Preparing" => $"Your order {order.OrderNumber} is now being prepared!",
            "Ready"     => $"Your order {order.OrderNumber} is ready! Please go to the canteen to pick up and pay.",
            "Completed" => $"Your order {order.OrderNumber} has been completed. Thank you!",
            "Cancelled" => $"Your order {order.OrderNumber} has been cancelled.",
            _           => $"Order status updated to {request.Status}."
        };

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
