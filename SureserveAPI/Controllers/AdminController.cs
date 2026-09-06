using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
// Fixed menu items loading for admin panel - ensures vendors show their products correctly
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;

    public AdminController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get overview metrics for school canteen administration.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var totalStudents = await _context.Users.CountAsync(u => u.Role == "Student");
        var totalVendors = await _context.Users.CountAsync(u => u.Role == "Vendor");
        var totalOrders = await _context.Orders.CountAsync();
        var totalRevenue = await _context.Orders
            .Where(o => o.Status == "Completed" || o.Status == "Ready" || o.Status == "Preparing")
            .SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;

        var passkeySetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VendorPasskey");
        var currentPasskey = passkeySetting?.Value ?? string.Empty;

        return Ok(new
        {
            totalStudents,
            totalVendors,
            totalOrders,
            totalRevenue,
            currentPasskey
        });
    }

    /// <summary>
    /// Get active vendor registration passkey.
    /// </summary>
    [HttpGet("passkey")]
    public async Task<IActionResult> GetPasskey()
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VendorPasskey");
        return Ok(new { passkey = setting?.Value ?? string.Empty });
    }

    /// <summary>
    /// Update vendor registration passkey.
    /// </summary>
    [HttpPost("passkey")]
    public async Task<IActionResult> UpdatePasskey([FromBody] UpdatePasskeyRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Passkey))
        {
            return BadRequest(new { message = "Passkey cannot be empty." });
        }

        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == "VendorPasskey");
        if (setting == null)
        {
            setting = new SystemSetting { Key = "VendorPasskey", Value = request.Passkey.Trim(), UpdatedAt = DateTime.UtcNow };
            _context.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = request.Passkey.Trim();
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Vendor Passkey updated successfully!", passkey = setting.Value });
    }

    /// <summary>
    /// List all registered students.
    /// </summary>
    [HttpGet("students")]
    public async Task<IActionResult> GetStudents()
    {
        // NOTE: We avoid embedding Orders here because EF Core ignores .Include() chains
        // when .Select() projections are used. Orders are fetched via the dedicated endpoint.
        var students = await _context.Users
            .Where(u => u.Role == "Student")
            .Include(u => u.StudentProfile)
            .Include(u => u.Orders)
                .ThenInclude(o => o.OrderItems)
                    .ThenInclude(oi => oi.MenuItem)
                        .ThenInclude(mi => mi.VendorProfile)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.FullName,
                u.Email,
                u.ContactNumber,
                u.CreatedAt,
                StudentId = u.StudentProfile != null ? u.StudentProfile.StudentId : "N/A",
                GradeSection = u.StudentProfile != null ? u.StudentProfile.GradeSection : "N/A",
                Strand = u.StudentProfile != null ? u.StudentProfile.Strand : "",
                Age = u.StudentProfile != null ? u.StudentProfile.Age : 0,
                Birthday = u.StudentProfile != null ? u.StudentProfile.Birthday : "",
                Address = u.StudentProfile != null ? u.StudentProfile.Address : "",
                TotalOrders = u.Orders.Count,
                Stalls = u.Orders.SelectMany(o => o.OrderItems)
                                 .Select(oi => oi.MenuItem.VendorProfile.ShopName)
                                 .Distinct()
                                 .ToList()
            })
            .ToListAsync();

        return Ok(students);
    }

    /// <summary>
    /// Delete a registered student account and profile.
    /// </summary>
    [HttpDelete("students/{id}")]
    [HttpPost("students/{id}/delete")]
    public async Task<IActionResult> DeleteStudent(int id)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.StudentProfile)
                .FirstOrDefaultAsync(u => u.Role == "Student" && (u.Id == id || (u.StudentProfile != null && u.StudentProfile.Id == id)));

            StudentProfile? studentProfile = user?.StudentProfile;

            if (studentProfile == null)
            {
                studentProfile = await _context.StudentProfiles
                    .Include(sp => sp.User)
                    .FirstOrDefaultAsync(sp => sp.Id == id || sp.UserId == id);

                if (user == null && studentProfile?.User != null && studentProfile.User.Role == "Student")
                {
                    user = studentProfile.User;
                }
            }

            if (user == null && studentProfile == null)
            {
                return NotFound(new { message = $"Student account with ID {id} not found." });
            }

            string fullName = user?.FullName ?? (studentProfile != null ? $"{studentProfile.FirstName} {studentProfile.LastName}".Trim() : "Student");

            if (studentProfile != null)
            {
                _context.StudentProfiles.Remove(studentProfile);
            }

            if (user != null)
            {
                var userCartItems = await _context.CartItems.Where(ci => ci.UserId == user.Id).ToListAsync();
                _context.CartItems.RemoveRange(userCartItems);

                var userReviews = await _context.Reviews.Where(r => r.UserId == user.Id).ToListAsync();
                _context.Reviews.RemoveRange(userReviews);

                var userOrders = await _context.Orders.Include(o => o.OrderItems).Where(o => o.UserId == user.Id).ToListAsync();
                foreach (var o in userOrders)
                {
                    _context.OrderItems.RemoveRange(o.OrderItems);
                }
                _context.Orders.RemoveRange(userOrders);

                _context.Users.Remove(user);
            }

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Student '{fullName}' deleted successfully!" });
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = $"Failed to delete student account: {detail}" });
        }
    }

    /// <summary>
    /// List all registered canteen vendors.
    /// </summary>
    [HttpGet("vendors")]
    public async Task<IActionResult> GetVendors()
    {
        var vendorUsers = await _context.Users
            .Where(u => u.Role == "Vendor")
            .Include(u => u.VendorProfile)
                .ThenInclude(vp => vp!.MenuItems)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var vendorUserIds = vendorUsers.Select(u => u.Id).ToList();

        var orphanProfiles = await _context.VendorProfiles
            .Include(vp => vp.MenuItems)
            .Include(vp => vp.User)
            .Where(vp => !vendorUserIds.Contains(vp.UserId))
            .ToListAsync();

        static List<object> MapMenuItems(IEnumerable<MenuItem> items) =>
            items.OrderBy(m => m.Name).Select(m => (object)new
            {
                id = m.Id,
                name = m.Name,
                description = m.Description,
                price = m.Price,
                imageUrl = m.ImageUrl,
                isAvailable = m.IsAvailable,
                isSpecial = m.IsSpecial,
                stock = m.Stock
            }).ToList();

        var result = new List<object>();

        foreach (var u in vendorUsers)
        {
            // Ensure menu items are loaded
            var menuItems = new List<MenuItem>();
            if (u.VendorProfile != null)
            {
                if (!u.VendorProfile.MenuItems.Any())
                {
                    u.VendorProfile.MenuItems = await _context.MenuItems
                        .Where(m => m.VendorProfileId == u.VendorProfile.Id)
                        .ToListAsync();
                }
                menuItems = u.VendorProfile.MenuItems.ToList();
            }

            result.Add(new
            {
                id = u.Id,
                username = u.Username,
                fullName = u.FullName,
                email = u.Email,
                contactNumber = u.ContactNumber,
                createdAt = u.CreatedAt,
                vendorProfileId = u.VendorProfile != null ? u.VendorProfile.Id : 0,
                shopName = u.VendorProfile != null ? u.VendorProfile.ShopName : (string.IsNullOrWhiteSpace(u.FullName) ? "Unassigned Stall" : u.FullName),
                isActive = u.VendorProfile != null ? u.VendorProfile.IsActive : false,
                status = u.VendorProfile != null
                    ? (string.IsNullOrEmpty(u.VendorProfile.Status)
                        ? (u.VendorProfile.IsActive ? "Active" : "Deactivated")
                        : u.VendorProfile.Status)
                    : "Deactivated",
                age = u.VendorProfile != null ? u.VendorProfile.Age : 0,
                birthday = u.VendorProfile != null ? u.VendorProfile.Birthday : "",
                address = u.VendorProfile != null ? u.VendorProfile.Address : "",
                itemCount = menuItems.Count,
                menuItems = MapMenuItems(menuItems)
            });
        }

        foreach (var vp in orphanProfiles)
        {
            // Ensure menu items are loaded
            var menuItems = vp.MenuItems.ToList();
            if (!menuItems.Any())
            {
                menuItems = await _context.MenuItems
                    .Where(m => m.VendorProfileId == vp.Id)
                    .ToListAsync();
            }

            result.Add(new
            {
                id = vp.UserId > 0 ? vp.UserId : vp.Id,
                username = vp.User != null ? vp.User.Username : "vendor",
                fullName = vp.User != null ? vp.User.FullName : vp.ShopName,
                email = vp.User != null ? vp.User.Email : "",
                contactNumber = vp.User != null ? vp.User.ContactNumber : "",
                createdAt = vp.User != null ? vp.User.CreatedAt : DateTime.UtcNow,
                vendorProfileId = vp.Id,
                shopName = string.IsNullOrWhiteSpace(vp.ShopName) ? "Unassigned Stall" : vp.ShopName,
                isActive = vp.IsActive,
                status = string.IsNullOrEmpty(vp.Status) ? (vp.IsActive ? "Active" : "Deactivated") : vp.Status,
                age = vp.Age,
                birthday = vp.Birthday,
                address = vp.Address,
                itemCount = menuItems.Count,
                menuItems = MapMenuItems(menuItems)
            });
        }

        return Ok(result);
    }

    /// <summary>
    /// Update vendor status (activate, deactivate, block, unblock).
    /// </summary>
    [HttpPost("vendors/{id}/status")]
    public async Task<IActionResult> UpdateVendorStatus(int id, [FromBody] VendorStatusRequest request)
    {
        var user = await _context.Users
            .Include(u => u.VendorProfile)
            .FirstOrDefaultAsync(u => u.Role == "Vendor" && (u.Id == id || (u.VendorProfile != null && u.VendorProfile.Id == id)));

        VendorProfile? vendorProfile = user?.VendorProfile;
        if (vendorProfile == null)
        {
            vendorProfile = await _context.VendorProfiles.FirstOrDefaultAsync(vp => vp.Id == id || vp.UserId == id);
        }

        if (vendorProfile == null && user != null)
        {
            vendorProfile = new VendorProfile
            {
                UserId = user.Id,
                ShopName = string.IsNullOrWhiteSpace(user.FullName) ? "Canteen Stall" : user.FullName,
                IsActive = true,
                Status = "Active"
            };
            _context.VendorProfiles.Add(vendorProfile);
        }

        if (vendorProfile == null)
        {
            return NotFound(new { message = "Vendor profile not found." });
        }

        string action = (request?.Action ?? "").ToLower();
        switch (action)
        {
            case "activate":
            case "unblock":
                vendorProfile.IsActive = true;
                vendorProfile.Status = "Active";
                break;
            case "deactivate":
                vendorProfile.IsActive = false;
                vendorProfile.Status = "Deactivated";
                break;
            case "block":
                vendorProfile.IsActive = false;
                vendorProfile.Status = "Blocked";
                break;
            case "delete":
                return await DeleteVendor(id);
            default:
                return BadRequest(new { message = "Invalid status action specified." });
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = $"Vendor status updated to {vendorProfile.Status} successfully!",
            status = vendorProfile.Status,
            isActive = vendorProfile.IsActive
        });
    }

    /// <summary>
    /// Toggle vendor active/suspended status.
    /// </summary>
    [HttpPost("vendors/{id}/toggle-status")]
    public async Task<IActionResult> ToggleVendorStatus(int id)
    {
        var user = await _context.Users
            .Include(u => u.VendorProfile)
            .FirstOrDefaultAsync(u => u.Role == "Vendor" && (u.Id == id || (u.VendorProfile != null && u.VendorProfile.Id == id)));

        VendorProfile? vendorProfile = user?.VendorProfile;
        if (vendorProfile == null)
        {
            vendorProfile = await _context.VendorProfiles.FirstOrDefaultAsync(vp => vp.Id == id || vp.UserId == id);
        }

        if (vendorProfile == null && user != null)
        {
            vendorProfile = new VendorProfile
            {
                UserId = user.Id,
                ShopName = string.IsNullOrWhiteSpace(user.FullName) ? "Canteen Stall" : user.FullName,
                IsActive = true,
                Status = "Active"
            };
            _context.VendorProfiles.Add(vendorProfile);
        }

        if (vendorProfile == null)
        {
            return NotFound(new { message = "Vendor profile not found." });
        }

        vendorProfile.IsActive = !vendorProfile.IsActive;
        vendorProfile.Status = vendorProfile.IsActive ? "Active" : "Deactivated";
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = vendorProfile.IsActive ? "Vendor activated successfully!" : "Vendor deactivated.",
            status = vendorProfile.Status,
            isActive = vendorProfile.IsActive
        });
    }

    /// <summary>
    /// Delete a vendor stall user and profile.
    /// </summary>
    [HttpDelete("vendors/{id}")]
    [HttpPost("vendors/{id}/delete")]
    public async Task<IActionResult> DeleteVendor(int id)
    {
        try
        {
            var user = await _context.Users
                .Include(u => u.VendorProfile)
                    .ThenInclude(vp => vp!.MenuItems)
                .FirstOrDefaultAsync(u => u.Role == "Vendor" && (u.Id == id || (u.VendorProfile != null && u.VendorProfile.Id == id)));

            VendorProfile? vendorProfile = user?.VendorProfile;

            if (vendorProfile == null)
            {
                vendorProfile = await _context.VendorProfiles
                    .Include(vp => vp.MenuItems)
                    .Include(vp => vp.User)
                    .FirstOrDefaultAsync(vp => vp.Id == id || vp.UserId == id);

                if (user == null && vendorProfile?.User != null && vendorProfile.User.Role == "Vendor")
                {
                    user = vendorProfile.User;
                }
            }

            if (user == null && vendorProfile == null)
            {
                return NotFound(new { message = $"Vendor stall with ID {id} not found." });
            }

            string shopName = vendorProfile?.ShopName ?? user?.FullName ?? "Vendor Stall";

            var menuItems = vendorProfile != null 
                ? vendorProfile.MenuItems.ToList() 
                : new List<MenuItem>();

            if (!menuItems.Any() && vendorProfile != null)
            {
                menuItems = await _context.MenuItems.Where(m => m.VendorProfileId == vendorProfile.Id).ToListAsync();
            }

            if (menuItems.Any())
            {
                var menuItemIds = menuItems.Select(m => m.Id).ToList();

                var cartItems = await _context.CartItems.Where(ci => menuItemIds.Contains(ci.MenuItemId)).ToListAsync();
                _context.CartItems.RemoveRange(cartItems);

                var orderItems = await _context.OrderItems.Where(oi => menuItemIds.Contains(oi.MenuItemId)).ToListAsync();
                _context.OrderItems.RemoveRange(orderItems);

                var reviews = await _context.Reviews.Where(r => menuItemIds.Contains(r.MenuItemId)).ToListAsync();
                _context.Reviews.RemoveRange(reviews);

                _context.MenuItems.RemoveRange(menuItems);
            }

            if (vendorProfile != null)
            {
                _context.VendorProfiles.Remove(vendorProfile);
            }

            if (user != null)
            {
                var userCartItems = await _context.CartItems.Where(ci => ci.UserId == user.Id).ToListAsync();
                _context.CartItems.RemoveRange(userCartItems);

                var userReviews = await _context.Reviews.Where(r => r.UserId == user.Id).ToListAsync();
                _context.Reviews.RemoveRange(userReviews);

                var userOrders = await _context.Orders.Include(o => o.OrderItems).Where(o => o.UserId == user.Id).ToListAsync();
                foreach (var o in userOrders)
                {
                    _context.OrderItems.RemoveRange(o.OrderItems);
                }
                _context.Orders.RemoveRange(userOrders);

                var userPasskeys = await _context.VendorPasskeys
                    .Where(p => p.UsedByUsername != null && p.UsedByUsername.ToLower() == user.Username.ToLower())
                    .ToListAsync();
                foreach (var pk in userPasskeys)
                {
                    pk.IsUsed = false;
                    pk.UsedByUsername = null;
                }

                _context.Users.Remove(user);
            }

            var emptyOrders = await _context.Orders
                .Include(o => o.OrderItems)
                .Where(o => !o.OrderItems.Any())
                .ToListAsync();
            _context.Orders.RemoveRange(emptyOrders);

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Vendor stall '{shopName}' deleted successfully!" });
        }
        catch (Exception ex)
        {
            var detail = ex.InnerException?.Message ?? ex.Message;
            return StatusCode(500, new { message = $"Failed to delete vendor stall: {detail}" });
        }
    }

    /// <summary>
    /// Get all products/menu items for a specific vendor by User ID or VendorProfile ID.
    /// </summary>
    [HttpGet("vendors/{id}/products")]
    public async Task<IActionResult> GetVendorProducts(int id)
    {
        // Try to find VendorProfile by User ID first
        var vendorProfile = await _context.VendorProfiles
            .Include(vp => vp.MenuItems)
            .FirstOrDefaultAsync(vp => vp.UserId == id);

        // If not found by User ID, try by VendorProfile ID
        if (vendorProfile == null)
        {
            vendorProfile = await _context.VendorProfiles
                .Include(vp => vp.MenuItems)
                .FirstOrDefaultAsync(vp => vp.Id == id);
        }

        // If still not found, try to find User first and then their VendorProfile
        if (vendorProfile == null)
        {
            var user = await _context.Users
                .Include(u => u.VendorProfile)
                    .ThenInclude(vp => vp!.MenuItems)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == "Vendor");

            if (user != null && user.VendorProfile != null)
            {
                vendorProfile = user.VendorProfile;
            }
        }

        if (vendorProfile == null)
            return Ok(new List<object>());

        // Ensure MenuItems are loaded if not already
        if (!vendorProfile.MenuItems.Any())
        {
            vendorProfile.MenuItems = await _context.MenuItems
                .Where(mi => mi.VendorProfileId == vendorProfile.Id)
                .ToListAsync();
        }

        var items = vendorProfile.MenuItems
            .OrderBy(mi => mi.Name)
            .Select(mi => new
            {
                id = mi.Id,
                name = mi.Name,
                description = mi.Description,
                price = mi.Price,
                imageUrl = mi.ImageUrl,
                isAvailable = mi.IsAvailable,
                isSpecial = mi.IsSpecial,
                stock = mi.Stock
            }).ToList();

        return Ok(items);
    }

public class VendorStatusRequest
{
    public string Action { get; set; } = string.Empty;
}

    /// <summary>
    /// List all individual vendor passkeys.
    /// </summary>
    [HttpGet("vendor-passkeys")]
    public async Task<IActionResult> GetVendorPasskeys()
    {
        var passkeys = await _context.VendorPasskeys
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        // Enrich redeemed passkeys with stall name and owner name
        var result = new List<object>();
        foreach (var pk in passkeys)
        {
            string? shopName = null;
            string? ownerName = null;

            if (pk.IsUsed && !string.IsNullOrWhiteSpace(pk.UsedByUsername))
            {
                var redeemerUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username.ToLower() == pk.UsedByUsername.ToLower());

                if (redeemerUser != null)
                {
                    var vendorProfile = await _context.VendorProfiles
                        .FirstOrDefaultAsync(v => v.UserId == redeemerUser.Id);

                    shopName = vendorProfile?.ShopName;
                    ownerName = vendorProfile != null
                        ? $"{vendorProfile.FirstName} {vendorProfile.LastName}".Trim()
                        : redeemerUser.FullName;
                }
            }

            result.Add(new
            {
                pk.Id,
                pk.Code,
                pk.Description,
                pk.IsUsed,
                pk.UsedByUsername,
                pk.CreatedAt,
                ShopName = shopName,
                OwnerName = ownerName
            });
        }

        return Ok(result);
    }

    /// <summary>
    /// Create a new individual vendor passkey.
    /// </summary>
    [HttpPost("vendor-passkeys")]
    public async Task<IActionResult> CreateVendorPasskey([FromBody] CreateVendorPasskeyRequest request)
    {
        var code = string.IsNullOrWhiteSpace(request.Code)
            ? $"SURESERVE-PASS-{new Random().Next(1000, 9999)}"
            : request.Code.Trim();

        var passkey = new VendorPasskey
        {
            Code = code,
            Description = string.IsNullOrWhiteSpace(request.Description) ? "Authorized Canteen Vendor Passkey" : request.Description.Trim(),
            IsUsed = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.VendorPasskeys.Add(passkey);
        await _context.SaveChangesAsync();

        return Ok(passkey);
    }

    /// <summary>
    /// Delete / Revoke a vendor passkey.
    /// </summary>
    [HttpDelete("vendor-passkeys/{id}")]
    public async Task<IActionResult> DeleteVendorPasskey(int id)
    {
        var passkey = await _context.VendorPasskeys.FindAsync(id);
        if (passkey == null) return NotFound(new { message = "Passkey not found." });

        _context.VendorPasskeys.Remove(passkey);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Passkey revoked successfully." });
    }

    /// <summary>
    /// Get all orders for a specific student. Uses a 2-step query to avoid
    /// EF Core ignoring .Include() chains inside .Select() projections.
    /// </summary>
    [HttpGet("students/{id}/orders")]
    public async Task<IActionResult> GetStudentOrders(int id)
    {
        // Step 1: Fetch all raw orders for this user ID
        var rawOrders = await _context.Orders
            .Where(o => o.UserId == id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        if (!rawOrders.Any())
            return Ok(new List<object>());

        // Step 2: Fetch all order items for these orders, with full navigation chain
        var orderIds = rawOrders.Select(o => o.Id).ToList();
        var rawItems = await _context.OrderItems
            .Include(oi => oi.MenuItem)
                .ThenInclude(m => m.VendorProfile)
            .Where(oi => orderIds.Contains(oi.OrderId))
            .ToListAsync();

        // Step 3: Build the result by joining in memory
        var result = rawOrders.Select(o => new
        {
            id = o.Id,
            orderNumber = o.OrderNumber,
            status = o.Status,
            subTotal = o.SubTotal,
            totalAmount = o.TotalAmount,
            createdAt = o.CreatedAt,
            items = rawItems
                .Where(oi => oi.OrderId == o.Id)
                .Select(oi => new
                {
                    id = oi.Id,
                    itemName = oi.MenuItem != null ? oi.MenuItem.Name : "Unknown Item",
                    quantity = oi.Quantity,
                    price = oi.Price,
                    stallName = oi.MenuItem?.VendorProfile?.ShopName ?? "Unknown Stall"
                }).ToList()
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Get all orders across all students for admin monitoring.
    /// </summary>
    [HttpGet("orders")]
    public async Task<IActionResult> GetAllOrders([FromQuery] string? status, [FromQuery] int? userId)
    {
        var query = _context.Orders
            .Include(o => o.User)
                .ThenInclude(u => u.StudentProfile)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.MenuItem)
                    .ThenInclude(mi => mi.VendorProfile)
            .AsQueryable();

        if (userId.HasValue && userId.Value > 0)
        {
            query = query.Where(o => o.UserId == userId.Value);
        }

        if (!string.IsNullOrEmpty(status) && status.ToLower() != "all")
        {
            query = query.Where(o => o.Status == status);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        // Pre-compute cancellation counts per user
        var userIds = orders.Select(o => o.UserId).Distinct().ToList();
        var cancelCounts = await _context.Orders
            .Where(o => userIds.Contains(o.UserId) && o.Status == "Cancelled")
            .GroupBy(o => o.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var result = orders.Select(o => new
        {
            o.Id,
            o.OrderNumber,
            o.Status,
            o.SubTotal,
            o.TotalAmount,
            o.CreatedAt,
            UserId = o.UserId,
            StudentName = o.User.FullName,
            StudentId = o.User.StudentProfile != null ? o.User.StudentProfile.StudentId : "N/A",
            StudentUsername = o.User.Username,
            StudentRole = o.User.Role,
            CancellationCount = cancelCounts.ContainsKey(o.UserId) ? cancelCounts[o.UserId] : 0,
            Items = o.OrderItems.Select(oi => new
            {
                oi.Id,
                ItemName = oi.MenuItem != null ? oi.MenuItem.Name : "Unknown Item",
                oi.Quantity,
                oi.Price,
                StallName = oi.MenuItem?.VendorProfile != null ? oi.MenuItem.VendorProfile.ShopName : "Unknown Stall"
            })
        });

        return Ok(result);
    }
}

public class UpdatePasskeyRequest
{
    public string Passkey { get; set; } = string.Empty;
}

public class CreateVendorPasskeyRequest
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
