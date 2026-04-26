namespace GymManagement.Core.DTOs
{
    public class UserTypeDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class CreateUserTypeDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    public class UpdateUserTypeDto
    {
        public string? Name { get; set; }
        public string? Description { get; set; }
    }
}
