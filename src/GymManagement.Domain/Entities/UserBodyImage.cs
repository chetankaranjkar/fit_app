namespace GymManagement.Domain.Entities
{
    public class UserBodyImage : BaseEntity
    {
        public int UserId { get; set; }
        public string ImageUrl { get; set; } = string.Empty;
        public string ImageType { get; set; } = "FullBody"; // FullBody, Front, Side, Back
        public DateTime ImageDate { get; set; } = DateTime.UtcNow;
        public string? Notes { get; set; }
        /// <summary>Optional snapshot metrics logged with this progress photo.</summary>
        public decimal? WeightKg { get; set; }
        public decimal? BodyFatPercent { get; set; }
        public int? UploadedById { get; set; } // Admin or Instructor who uploaded
        public string? UploadedByType { get; set; } // "Admin" or "Instructor"

        // Navigation properties
        public User User { get; set; } = null!;
    }
}

