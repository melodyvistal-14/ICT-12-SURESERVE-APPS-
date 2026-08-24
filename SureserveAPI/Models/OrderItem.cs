using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class OrderItem
{
    public int Id { get; set; }

    [Required]
    public int OrderId { get; set; }

    [Required]
    public int MenuItemId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ItemName { get; set; } = string.Empty; // Snapshot of item name at order time

    [Required]
    [Column(TypeName = "decimal(10,2)")]
    public decimal Price { get; set; } // Snapshot of price at order time

    [Required]
    [Range(1, 100)]
    public int Quantity { get; set; } = 1;

    // Navigation
    [ForeignKey("OrderId")]
    public Order Order { get; set; } = null!;

    [ForeignKey("MenuItemId")]
    public MenuItem MenuItem { get; set; } = null!;
}
