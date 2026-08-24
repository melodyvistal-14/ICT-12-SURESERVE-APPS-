using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get current user's profile.
    /// </summary>
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = GetUserId();
        var user = await _context.Users
            .Include(u => u.StudentProfile)
            .Include(u => u.VendorProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound(new { message = "User not found." });

        return Ok(new
        {
            user.Id,
            user.Username,
            user.FullName,
            user.Email,
            user.ContactNumber,
            user.ProfileImageUrl,
            user.Role,
            StudentProfile = user.StudentProfile == null ? null : new
            {
                user.StudentProfile.StudentId,
                user.StudentProfile.GradeSection,
                user.StudentProfile.Building,
                user.StudentProfile.Floor,
                user.StudentProfile.Room
            },
            VendorProfile = user.VendorProfile == null ? null : new
            {
                user.VendorProfile.ShopName,
                user.VendorProfile.Description,
                user.VendorProfile.LogoUrl,
                user.VendorProfile.IsActive
            }
        });
    }

    /// <summary>
    /// Update current user's profile.
    /// </summary>
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        var user = await _context.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound(new { message = "User not found." });

        if (request.FullName != null) user.FullName = request.FullName;
        if (request.Email != null) user.Email = request.Email;
        if (request.ContactNumber != null) user.ContactNumber = request.ContactNumber;
        if (request.ProfileImageUrl != null) user.ProfileImageUrl = request.ProfileImageUrl;

        // Update student profile if applicable
        if (user.Role == "Student" && request.StudentInfo != null)
        {
            if (user.StudentProfile == null)
            {
                user.StudentProfile = new Models.StudentProfile { UserId = userId };
                _context.StudentProfiles.Add(user.StudentProfile);
            }

            if (request.StudentInfo.GradeSection != null)
                user.StudentProfile.GradeSection = request.StudentInfo.GradeSection;
            if (request.StudentInfo.Building != null)
                user.StudentProfile.Building = request.StudentInfo.Building;
            if (request.StudentInfo.Floor != null)
                user.StudentProfile.Floor = request.StudentInfo.Floor;
            if (request.StudentInfo.Room != null)
                user.StudentProfile.Room = request.StudentInfo.Room;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Profile updated." });
    }

    /// <summary>
    /// Get all users (Admin only).
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAllUsers()
    {
        var users = await _context.Users
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.FullName,
                u.Role,
                u.CreatedAt
            })
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Delete a user (Admin only).
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);

        if (user == null)
            return NotFound(new { message = "User not found." });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "User deleted." });
    }
}

// --- Request DTOs ---

public class UpdateProfileRequest
{
    public string? FullName { get; set; }
    public string? Email { get; set; }
    public string? ContactNumber { get; set; }
    public string? ProfileImageUrl { get; set; }
    public StudentInfoRequest? StudentInfo { get; set; }
}

public class StudentInfoRequest
{
    public string? GradeSection { get; set; }
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public string? Room { get; set; }
}
