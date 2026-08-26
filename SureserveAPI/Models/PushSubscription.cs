using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class PushSubscription
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public string Endpoint { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string P256dh { get; set; } = string.Empty;

    [Required]
    [MaxLength(255)]
    public string Auth { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}
