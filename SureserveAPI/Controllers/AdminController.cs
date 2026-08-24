using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
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

        var result = vendorUsers.Select(u => new
        {
            u.Id,
            u.Username,
            u.FullName,
            u.Email,
            u.ContactNumber,
            u.CreatedAt,
            VendorProfileId = u.VendorProfile != null ? u.VendorProfile.Id : 0,
            ShopName = u.VendorProfile != null ? u.VendorProfile.ShopName : (string.IsNullOrWhiteSpace(u.FullName) ? "Unassigned Stall" : u.FullName),
            IsActive = u.VendorProfile != null ? u.VendorProfile.IsActive : false,
            Status = u.VendorProfile != null 
                ? (string.IsNullOrEmpty(u.VendorProfile.Status) 
                    ? (u.VendorProfile.IsActive ? "Active" : "Deactivated") 
                    : u.VendorProfile.Status) 
                : "Deactivated",
            Age = u.VendorProfile != null ? u.VendorProfile.Age : 0,
            Birthday = u.VendorProfile != null ? u.VendorProfile.Birthday : "",
            Address = u.VendorProfile != null ? u.VendorProfile.Address : "",
            ItemCount = u.VendorProfile != null ? u.VendorProfile.MenuItems.Count : 0
        }).ToList();

        foreach (var vp in orphanProfiles)
        {
            result.Add(new
            {
                Id = vp.UserId > 0 ? vp.UserId : vp.Id,
                Username = vp.User != null ? vp.User.Username : "vendor",
                FullName = vp.User != null ? vp.User.FullName : vp.ShopName,
                Email = vp.User != null ? vp.User.Email : "",
                ContactNumber = vp.User != null ? vp.User.ContactNumber : "",
                CreatedAt = vp.User != null ? vp.User.CreatedAt : DateTime.UtcNow,
                VendorProfileId = vp.Id,
                ShopName = string.IsNullOrWhiteSpace(vp.ShopName) ? "Unassigned Stall" : vp.ShopName,
                IsActive = vp.IsActive,
                Status = string.IsNullOrEmpty(vp.Status) ? (vp.IsActive ? "Active" : "Deactivated") : vp.Status,
                Age = vp.Age,
                Birthday = vp.Birthday,
                Address = vp.Address,
                ItemCount = vp.MenuItems.Count
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
