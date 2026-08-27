using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MenuItemsController : ControllerBase
{
    private readonly AppDbContext _context;

    public MenuItemsController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Browse all available menu items with optional filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetMenuItems(
        [FromQuery] int? categoryId,
        [FromQuery] string? search,
        [FromQuery] int? vendorId)
    {
        IQueryable<MenuItem> query = _context.MenuItems
            .Include(mi => mi.Category)
            .Include(mi => mi.VendorProfile);

        if (categoryId.HasValue)
            query = query.Where(mi => mi.CategoryId == categoryId.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(mi => mi.Name.ToLower().Contains(search.ToLower()));

        if (vendorId.HasValue)
            query = query.Where(mi => mi.VendorProfileId == vendorId.Value);

        var items = await query
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
                Category = mi.Category.Name,
                Vendor = mi.VendorProfile.ShopName,
                AverageRating = mi.Reviews.Any() ? Math.Round(mi.Reviews.Average(r => r.Rating), 1) : 0,
                ReviewCount = mi.Reviews.Count
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// Get all active vendor stalls (public — for vendor picker on home page).
    /// </summary>
    [HttpGet("vendors")]
    public async Task<IActionResult> GetVendors()
    {
        var vendors = await _context.VendorProfiles
            .Where(v => v.IsActive)
            .Select(v => new
            {
                v.Id,
                v.ShopName,
                v.Description,
                ItemCount = _context.MenuItems.Count(mi => mi.VendorProfileId == v.Id && mi.IsAvailable)
            })
            .ToListAsync();

        return Ok(vendors);
    }

    /// <summary>
    /// Get today's specials.
    /// </summary>
    [HttpGet("specials")]
    public async Task<IActionResult> GetSpecials()
    {
        var specials = await _context.MenuItems
            .Include(mi => mi.Category)
            .Include(mi => mi.VendorProfile)
            .Where(mi => mi.IsAvailable && mi.IsSpecial)
            .Select(mi => new
            {
                mi.Id,
                mi.Name,
                mi.Description,
                mi.Price,
                mi.ImageUrl,
                Category = mi.Category.Name,
                Vendor = mi.VendorProfile.ShopName,
                AverageRating = mi.Reviews.Any() ? Math.Round(mi.Reviews.Average(r => r.Rating), 1) : 0,
                ReviewCount = mi.Reviews.Count
            })
            .ToListAsync();

        return Ok(specials);
    }

    /// <summary>
    /// Get a menu item's full details including reviews.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetMenuItem(int id)
    {
        var item = await _context.MenuItems
            .Include(mi => mi.Category)
            .Include(mi => mi.VendorProfile)
            .Include(mi => mi.Reviews)
                .ThenInclude(r => r.User)
            .Where(mi => mi.Id == id)
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
                Category = mi.Category.Name,
                Vendor = new { mi.VendorProfile.Id, mi.VendorProfile.ShopName, mi.VendorProfile.LogoUrl },
                AverageRating = mi.Reviews.Any() ? Math.Round(mi.Reviews.Average(r => r.Rating), 1) : 0,
                ReviewCount = mi.Reviews.Count,
                Reviews = mi.Reviews.OrderByDescending(r => r.CreatedAt).Take(10).Select(r => new
                {
                    r.Id,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt,
                    User = r.User.FullName
                })
            })
            .FirstOrDefaultAsync();

        if (item == null)
            return NotFound(new { message = "Menu item not found." });

        return Ok(item);
    }

    /// <summary>
    /// Add a new menu item (Vendor only).
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> CreateMenuItem([FromBody] CreateMenuItemRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var vendor = await _context.VendorProfiles.FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        var menuItem = new MenuItem
        {
            VendorProfileId = vendor.Id,
            CategoryId = request.CategoryId,
            Name = request.Name,
            Description = request.Description,
            Price = request.Price,
            ImageUrl = request.ImageUrl,
            IsAvailable = request.IsAvailable,
            IsSpecial = request.IsSpecial,
            Stock = request.Stock
        };

        _context.MenuItems.Add(menuItem);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Menu item created.", menuItem.Id });
    }

    /// <summary>
    /// Update a menu item (Vendor only).
    /// </summary>
    [HttpPut("{id}")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> UpdateMenuItem(int id, [FromBody] UpdateMenuItemRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var vendor = await _context.VendorProfiles.FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(mi => mi.Id == id && mi.VendorProfileId == vendor.Id);

        if (menuItem == null)
            return NotFound(new { message = "Menu item not found." });

        if (request.Name != null) menuItem.Name = request.Name;
        if (request.Description != null) menuItem.Description = request.Description;
        if (request.Price.HasValue) menuItem.Price = request.Price.Value;
        if (request.ImageUrl != null) menuItem.ImageUrl = request.ImageUrl;
        if (request.CategoryId.HasValue) menuItem.CategoryId = request.CategoryId.Value;
        if (request.IsAvailable.HasValue) menuItem.IsAvailable = request.IsAvailable.Value;
        if (request.IsSpecial.HasValue) menuItem.IsSpecial = request.IsSpecial.Value;
        if (request.Stock.HasValue)
        {
            menuItem.Stock = request.Stock.Value;
            if (menuItem.Stock == 0)
            {
                // Auto-mark unavailable when stock hits 0
                menuItem.IsAvailable = false;
            }
            else if (menuItem.Stock > 0)
            {
                // Auto-restore availability when restocking,
                // unless the caller explicitly set isAvailable = false
                if (!request.IsAvailable.HasValue || request.IsAvailable.Value)
                {
                    menuItem.IsAvailable = true;
                }
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new { message = "Menu item updated." });
    }

    /// <summary>
    /// Delete a menu item (Vendor only).
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Vendor")]
    public async Task<IActionResult> DeleteMenuItem(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var vendor = await _context.VendorProfiles.FirstOrDefaultAsync(v => v.UserId == userId);

        if (vendor == null)
            return Forbid();

        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(mi => mi.Id == id && mi.VendorProfileId == vendor.Id);

        if (menuItem == null)
            return NotFound(new { message = "Menu item not found." });

        _context.MenuItems.Remove(menuItem);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Menu item deleted." });
    }
}

// --- Request DTOs ---

public class CreateMenuItemRequest
{
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsAvailable { get; set; } = true;
    public bool IsSpecial { get; set; } = false;
    public int Stock { get; set; } = 0;
}

public class UpdateMenuItemRequest
{
    public int? CategoryId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public string? ImageUrl { get; set; }
    public bool? IsAvailable { get; set; }
    public bool? IsSpecial { get; set; }
    public int? Stock { get; set; }
}
