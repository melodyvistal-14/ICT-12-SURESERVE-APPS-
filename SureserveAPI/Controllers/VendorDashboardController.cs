using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/vendor")]
[Authorize(Roles = "Vendor")]
public class VendorDashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public VendorDashboardController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get vendor dashboard stats.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var userId = GetUserId();

        // Get vendor profile for current user
        var vendor = await _context.VendorProfiles
            .FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        // Find all orders containing items belonging to this vendor
        var vendorOrders = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .Where(o => o.OrderItems.Any(oi => oi.MenuItem != null && oi.MenuItem.VendorProfileId == vendor.Id))
            .ToListAsync();

        var totalOrders = vendorOrders.Count;
        var totalItems = vendorOrders.Sum(o => o.OrderItems
            .Where(oi => oi.MenuItem != null && oi.MenuItem.VendorProfileId == vendor.Id)
            .Sum(oi => oi.Quantity));
        var estimatedSales = vendorOrders
            .Where(o => string.Equals(o.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            .Sum(o => o.TotalAmount);

        var pendingOrders = vendorOrders.Count(o => string.Equals(o.Status, "Pending", StringComparison.OrdinalIgnoreCase));
        var preparingOrders = vendorOrders.Count(o => string.Equals(o.Status, "Preparing", StringComparison.OrdinalIgnoreCase));
        var readyOrders = vendorOrders.Count(o => string.Equals(o.Status, "Ready", StringComparison.OrdinalIgnoreCase));

        return Ok(new
        {
            vendor.ShopName,
            vendor.LogoUrl,
            TotalOrders = totalOrders,
            TotalItems = totalItems,
            EstimatedSales = estimatedSales,
            PendingOrders = pendingOrders,
            PreparingOrders = preparingOrders,
            ReadyForPickup = readyOrders
        });
    }

    /// <summary>
    /// Get vendor's orders with student info.
    /// </summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetVendorOrders([FromQuery] string? status)
    {
        var userId = GetUserId();

        var vendor = await _context.VendorProfiles
            .FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        var query = _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
            .Include(o => o.User)
                .ThenInclude(u => u.StudentProfile)
            .Where(o => o.OrderItems.Any(oi => oi.MenuItem != null && oi.MenuItem.VendorProfileId == vendor.Id));

        if (!string.IsNullOrWhiteSpace(status))
        {
            var cleanStatus = status.Trim().ToLower();
            query = query.Where(o => o.Status.ToLower() == cleanStatus);
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
                Student = new
                {
                    o.User.FullName,
                    StudentId = o.User.StudentProfile != null ? o.User.StudentProfile.StudentId : "N/A",
                    GradeSection = o.User.StudentProfile != null ? o.User.StudentProfile.GradeSection : "Student"
                },
                Items = o.OrderItems
                    .Where(oi => oi.MenuItem != null && oi.MenuItem.VendorProfileId == vendor.Id)
                    .Select(oi => new
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
    /// Get vendor's own menu items.
    /// </summary>
    [HttpGet("menuitems")]
    public async Task<IActionResult> GetVendorMenuItems()
    {
        var userId = GetUserId();

        var vendor = await _context.VendorProfiles
            .FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        var items = await _context.MenuItems
            .Include(mi => mi.Category)
            .Where(mi => mi.VendorProfileId == vendor.Id)
            .Select(mi => new
            {
                mi.Id,
                mi.Name,
                mi.Description,
                mi.Price,
                mi.ImageUrl,
                mi.IsAvailable,
                mi.IsSpecial,
                mi.Stock,
                Category = mi.Category.Name
            })
            .ToListAsync();

        return Ok(items);
    }
}
