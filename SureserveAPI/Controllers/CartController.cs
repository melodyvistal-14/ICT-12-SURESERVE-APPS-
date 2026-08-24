using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SureserveAPI.Data;
using SureserveAPI.Models;
using System.Security.Claims;

namespace SureserveAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly AppDbContext _context;

    public CartController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Get the current user's cart.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();

        var cartItems = await _context.CartItems
            .Include(ci => ci.MenuItem)
                .ThenInclude(mi => mi.VendorProfile)
            .Where(ci => ci.UserId == userId)
            .Select(ci => new
            {
                ci.Id,
                ci.Quantity,
                MenuItem = new
                {
                    ci.MenuItem.Id,
                    ci.MenuItem.Name,
                    ci.MenuItem.Price,
                    ci.MenuItem.ImageUrl,
                    ci.MenuItem.IsAvailable,
                    ci.MenuItem.Stock,
                    Vendor = ci.MenuItem.VendorProfile.ShopName
                },
                LineTotal = ci.MenuItem.Price * ci.Quantity
            })
            .ToListAsync();

        var subtotal = cartItems.Sum(ci => ci.LineTotal);

        return Ok(new
        {
            Items = cartItems,
            ItemCount = cartItems.Sum(ci => ci.Quantity),
            SubTotal = subtotal,
            DeliveryFee = 0m,
            TotalAmount = subtotal
        });
    }

    /// <summary>
    /// Add an item to cart.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> AddToCart([FromBody] AddToCartRequest request)
    {
        var userId = GetUserId();

        var menuItem = await _context.MenuItems.FindAsync(request.MenuItemId);
        if (menuItem == null || !menuItem.IsAvailable)
            return BadRequest(new { message = "Menu item not available." });

        // Check if already in cart
        var existingItem = await _context.CartItems
            .FirstOrDefaultAsync(ci => ci.UserId == userId && ci.MenuItemId == request.MenuItemId);

        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
        }
        else
        {
            _context.CartItems.Add(new CartItem
            {
                UserId = userId,
                MenuItemId = request.MenuItemId,
                Quantity = request.Quantity
            });
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Item added to cart." });
    }

    /// <summary>
    /// Update cart item quantity.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCartItem(int id, [FromBody] UpdateCartItemRequest request)
    {
        var userId = GetUserId();
        var cartItem = await _context.CartItems
            .FirstOrDefaultAsync(ci => ci.Id == id && ci.UserId == userId);

        if (cartItem == null)
            return NotFound(new { message = "Cart item not found." });

        if (request.Quantity <= 0)
        {
            _context.CartItems.Remove(cartItem);
        }
        else
        {
            cartItem.Quantity = request.Quantity;
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Cart updated." });
    }

    /// <summary>
    /// Remove an item from cart.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> RemoveFromCart(int id)
    {
        var userId = GetUserId();
        var cartItem = await _context.CartItems
            .FirstOrDefaultAsync(ci => ci.Id == id && ci.UserId == userId);

        if (cartItem == null)
            return NotFound(new { message = "Cart item not found." });

        _context.CartItems.Remove(cartItem);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Item removed from cart." });
    }
}

// --- Request DTOs ---

public class AddToCartRequest
{
    public int MenuItemId { get; set; }
    public int Quantity { get; set; } = 1;
}

public class UpdateCartItemRequest
{
    public int Quantity { get; set; }
}
