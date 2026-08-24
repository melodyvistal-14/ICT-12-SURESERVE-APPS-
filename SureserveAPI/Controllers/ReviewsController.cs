using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReviewsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ReviewsController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get reviews for a menu item.
    /// </summary>
    [HttpGet("menuitem/{menuItemId}")]
    public async Task<IActionResult> GetReviews(int menuItemId)
    {
        var reviews = await _context.Reviews
            .Include(r => r.User)
            .Where(r => r.MenuItemId == menuItemId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                r.Id,
                r.Rating,
                r.Comment,
                r.CreatedAt,
                User = r.User.FullName
            })
            .ToListAsync();

        var averageRating = reviews.Any() ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;

        return Ok(new
        {
            AverageRating = averageRating,
            TotalReviews = reviews.Count,
            Reviews = reviews
        });
    }

    /// <summary>
    /// Submit a review for a menu item.
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateReview([FromBody] CreateReviewRequest request)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        // Check if menu item exists
        var menuItem = await _context.MenuItems.FindAsync(request.MenuItemId);
        if (menuItem == null)
            return NotFound(new { message = "Menu item not found." });

        // Check if user has already reviewed this item
        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.MenuItemId == request.MenuItemId);

        if (existingReview != null)
        {
            // Update existing review
            existingReview.Rating = request.Rating;
            existingReview.Comment = request.Comment ?? string.Empty;
            existingReview.CreatedAt = DateTime.UtcNow;
        }
        else
        {
            _context.Reviews.Add(new Review
            {
                UserId = userId,
                MenuItemId = request.MenuItemId,
                Rating = request.Rating,
                Comment = request.Comment ?? string.Empty
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Review submitted." });
    }
}

// --- Request DTOs ---

public class CreateReviewRequest
{
    public int MenuItemId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
}
