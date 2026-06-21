namespace GymManagement.Core.Options
{
    /// <summary>Public self-signup and online payment gateway settings.</summary>
    public class CommercialOptions
    {
        public const string SectionName = "Commercial";

        /// <summary>When true, anonymous clients may register as members via POST /api/public/signup.</summary>
        public bool EnableSelfSignup { get; set; }

        /// <summary>When true, members may pay pending membership balances online (Razorpay).</summary>
        public bool EnableOnlinePayments { get; set; }

        /// <summary>Razorpay Key ID (publishable). Required when <see cref="EnableOnlinePayments"/> is true.</summary>
        public string? RazorpayKeyId { get; set; }

        /// <summary>Razorpay Key Secret. Server-side only; never expose to clients.</summary>
        public string? RazorpayKeySecret { get; set; }

        /// <summary>Display name shown on Razorpay checkout.</summary>
        public string CheckoutBusinessName { get; set; } = "Tiger Fitness";

        public bool IsRazorpayConfigured =>
            !string.IsNullOrWhiteSpace(RazorpayKeyId) && !string.IsNullOrWhiteSpace(RazorpayKeySecret);
    }
}
