namespace GymManagement.Domain.Entities
{
    public class PersonalRecord
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int ExerciseId { get; set; }
        public decimal MaxWeight { get; set; }
        public int? MaxReps { get; set; }
        public DateTime RecordDate { get; set; }

        public User User { get; set; } = null!;
        public Exercise Exercise { get; set; } = null!;
    }
}
