namespace GymManagement.Core.DTOs
{
    public class UserBodyImageDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string ImageUrl { get; set; } = string.Empty;
        public string ImageType { get; set; } = string.Empty;
        public DateTime ImageDate { get; set; }
        public string? Notes { get; set; }
        public int? UploadedById { get; set; }
        public string? UploadedByType { get; set; }
        public string? UploadedByName { get; set; }
    }

    public class CreateUserBodyImageDto
    {
        public int UserId { get; set; }
        public string ImageType { get; set; } = "FullBody";
        public DateTime? ImageDate { get; set; }
        public string? Notes { get; set; }
    }

    public class UpdateUserBodyImageDto
    {
        public string? ImageType { get; set; }
        public DateTime? ImageDate { get; set; }
        public string? Notes { get; set; }
    }
}

