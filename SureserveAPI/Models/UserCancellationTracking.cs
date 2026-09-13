using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SureserveAPI.Models;

public class UserCancellationTracking
{
    public int Id { get; set; }

    [Required]
    public int UserId { get; set; }

    /// <summary>Number of cancellations in the current period</summary>
    public int CancellationCount { get; set; } = 0;

    /// <summary>Date when the cancellation block expires (if blocked)</summary>
    public DateTime? BlockExpiryDate { get; set; }

    /// <summary>Last date when cancellation count was reset</summary>
    public DateTime LastResetDate { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("UserId")]
    public User User { get; set; } = null!;
}