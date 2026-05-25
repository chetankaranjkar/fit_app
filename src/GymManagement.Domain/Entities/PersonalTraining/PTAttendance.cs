namespace GymManagement.Domain.Entities.PersonalTraining
{
    public class PTAttendance : BaseEntity
    {
        public int PTSessionId { get; set; }
        public bool MemberPresent { get; set; }
        public bool TrainerPresent { get; set; }
        public bool IsLate { get; set; }
        public bool IsNoShow { get; set; }
        public DateTime? CompletedAtUtc { get; set; }

        public PTSession PTSession { get; set; } = null!;
    }
}
