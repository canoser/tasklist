using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlanlamaApp.Application.Interfaces;
using PlanlamaApp.Domain.Entities;
using System.Security.Claims;
using System.Threading.Tasks;

namespace PlanlamaApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentRepository _repository;

        public PaymentsController(IPaymentRepository repository)
        {
            _repository = repository;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyPayments([FromQuery] string? status)
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            var payments = await _repository.GetByCoachAsync(coachId, status);
            return Ok(payments);
        }

        [HttpGet("student/{studentId}")]
        public async Task<IActionResult> GetStudentPayments(string studentId)
        {
            var payments = await _repository.GetByStudentAsync(studentId);
            return Ok(payments);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePayment([FromBody] PaymentRecord payment)
        {
            var coachId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(coachId)) return Unauthorized();

            payment.CoachUserId = coachId;
            var id = await _repository.CreateAsync(payment);
            return Ok(new { Id = id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePayment(int id, [FromBody] PaymentRecord payment)
        {
            payment.Id = id;
            var result = await _repository.UpdateAsync(payment);
            if (!result) return NotFound();
            return Ok();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePayment(int id)
        {
            var result = await _repository.DeleteAsync(id);
            if (!result) return NotFound();
            return Ok();
        }
    }
}
