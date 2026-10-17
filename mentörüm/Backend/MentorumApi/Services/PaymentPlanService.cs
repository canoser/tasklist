using System;
using System.Collections.Generic;
using MentorumApi.DTOs;

namespace MentorumApi.Services
{
    public class PaymentPlanService
    {
        public List<(DateTime DueDate, decimal BaseAmount, string Currency)> GenerateInitialItems(
            string periodType, 
            decimal amount, 
            string currency, 
            DateTime startDate, 
            int? monthDay, 
            int count = 3)
        {
            var items = new List<(DateTime DueDate, decimal BaseAmount, string Currency)>();
            var normalizedCurrency = string.IsNullOrWhiteSpace(currency) ? "TRY" : currency;

            if (periodType == "FOUR_WEEK")
            {
                for (int i = 0; i < count; i++)
                {
                    items.Add((startDate.Date.AddDays(i * 28), amount, normalizedCurrency));
                }
            }
            else if (periodType == "MONTHLY_DAY")
            {
                int targetDay = monthDay.HasValue && monthDay.Value >= 1 && monthDay.Value <= 28 ? monthDay.Value : Math.Min(startDate.Day, 28);
                var current = new DateTime(startDate.Year, startDate.Month, targetDay);
                if (current < startDate.Date) current = current.AddMonths(1);

                for (int i = 0; i < count; i++)
                {
                    items.Add((current.AddMonths(i), amount, normalizedCurrency));
                }
            }
            else // PER_LESSON veya PER_SESSION
            {
                // Başlangıç olarak haftalık 1 seans/ders varsayımıyla ilk taksitleri üret
                for (int i = 0; i < count; i++)
                {
                    items.Add((startDate.Date.AddDays(i * 7), amount, normalizedCurrency));
                }
            }

            return items;
        }
    }
}
