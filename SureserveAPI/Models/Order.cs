using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class Order
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    [MaxLength(20)]
    public string OrderNumber { get; set; } = string.Empty; // e.g. #ORD250520

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending"; // Pending, Preparing, Ready, Completed, Cancelled

    [Column(TypeName = "decimal(10,2)")]
    public decimal SubTotal { get; set; }

    [Column(TypeName = "decimal(10,2)")]
    public decimal TotalAmount { get; set; }

    [Required]
    [MaxLength(20)]
    public string DeliveryType { get; set; } = "Pickup"; // Pickup, Delivery

    [Column(TypeName = "decimal(10,2)")]
    public decimal DeliveryFee { get; set; } = 0m;

    [MaxLength(100)]
    public string Building { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Room { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Section { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}