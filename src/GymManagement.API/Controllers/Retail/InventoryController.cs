using System.Security.Claims;
using GymManagement.API.Attributes;
using GymManagement.Core.Authorization;
using GymManagement.Core.DTOs.Retail;
using GymManagement.Core.Services;
using GymManagement.Core.Services.Retail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GymManagement.API.Controllers.Retail
{
    [ApiController]
    [Route("api/retail/inventory")]
    [Authorize]
    [HasPermission(PermissionCodes.RetailPos)]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;

        public InventoryController(IInventoryService service)
        {
            _service = service;
        }

        [HttpPost("inward")]
        public async Task<ActionResult<InventoryTransactionDto>> RecordInward([FromBody] CreateStockInwardDto dto, CancellationToken ct)
            => Ok(await _service.RecordInwardAsync(dto, ResolveUserId(), ct));

        [HttpPost("adjust")]
        public async Task<ActionResult<InventoryTransactionDto>> RecordAdjustment([FromBody] CreateStockAdjustmentDto dto, CancellationToken ct)
            => Ok(await _service.RecordAdjustmentAsync(dto, ResolveUserId(), ct));

        [HttpGet("transactions/{productId:int}")]
        public async Task<ActionResult<IReadOnlyList<InventoryTransactionDto>>> GetTransactions(int productId, CancellationToken ct)
            => Ok(await _service.GetTransactionsAsync(productId, ct));

        [HttpGet("alerts/low-stock")]
        public async Task<ActionResult<IReadOnlyList<InventoryAlertDto>>> GetLowStockAlerts(CancellationToken ct)
            => Ok(await _service.GetLowStockAlertsAsync(ct));

        [HttpGet("alerts/expiry")]
        public async Task<ActionResult<IReadOnlyList<InventoryAlertDto>>> GetExpiryAlerts([FromQuery] int daysAhead = 30, CancellationToken ct = default)
            => Ok(await _service.GetExpiryAlertsAsync(daysAhead, ct));

        private int? ResolveUserId()
        {
            var raw = User.FindFirstValue(JwtClaimTypes.UserId);
            return int.TryParse(raw, out var id) ? id : null;
        }
    }
}
