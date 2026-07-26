using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using planlama_app.Data;
using planlama_app.Models;

namespace planlama_app.Services
{
    /// <summary>
    /// Bir .txt dosyasını okuyup, görev verilerini parse eden ve
    /// TaskRepository aracılığıyla veritabanına aktaran servis.
    /// </summary>
    public class ImportService
    {
        // ---------------------------------------------------------------
        // Sabitler
        // ---------------------------------------------------------------
        private const char Delimiter     = '|';
        private const int  FieldCount    = 6;

        // Alan indeksleri (okunabilirlik için)
        private const int IdxDate      = 0;
        private const int IdxType      = 1;
        private const int IdxChainId   = 2;
        private const int IdxOrder     = 3;
        private const int IdxEstTime   = 4;
        private const int IdxTitle     = 5;

        // ---------------------------------------------------------------
        // Bağımlılık
        // ---------------------------------------------------------------
        private readonly TaskRepository _repository;

        public ImportService(TaskRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        // ---------------------------------------------------------------
        // İÇE AKTARMA SONUÇ MODELİ
        // ---------------------------------------------------------------

        /// <summary>
        /// İçe aktarma işleminin özet sonucunu tutar.
        /// </summary>
        public sealed class ImportResult
        {
            /// <summary>Başarıyla eklenen görev sayısı.</summary>
            public int SuccessCount { get; set; }

            /// <summary>Parse edilemeyen veya atlanan satır sayısı.</summary>
            public int SkippedCount { get; set; }

            /// <summary>Atlanan satırların detayları (satır no + hata mesajı).</summary>
            public List<string> Errors { get; } = new();

            public override string ToString() =>
                $"Aktarıldı: {SuccessCount} | Atlandı: {SkippedCount}";
        }

        // ---------------------------------------------------------------
        // ANA METOD: İÇE AKTAR
        // ---------------------------------------------------------------

        /// <summary>
        /// Belirtilen .txt dosyasını okur, her satırı parse eder ve
        /// geçerli görevleri veritabanına ekler.
        /// </summary>
        /// <param name="filePath">Okunacak .txt dosyasının tam yolu.</param>
        /// <returns>
        /// Başarı/başarısızlık sayılarını ve hata detaylarını içeren ImportResult.
        /// </returns>
        /// <exception cref="FileNotFoundException">Dosya bulunamazsa fırlatılır.</exception>
        public async Task<ImportResult> ImportFromTxtAsync(string filePath, int? categoryId = null)
        {
            if (!File.Exists(filePath))
                throw new FileNotFoundException("İçe aktarılacak dosya bulunamadı.", filePath);

            var result     = new ImportResult();
            var lines      = await File.ReadAllLinesAsync(filePath);
            int lineNumber = 0;

            foreach (string rawLine in lines)
            {
                lineNumber++;

                // Boş satırları ve yorum satırlarını (#) sessizce atla
                string trimmed = rawLine.Trim();
                if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith('#'))
                    continue;

                try
                {
                    var task = ParseLine(trimmed, lineNumber);
                    task.CategoryId = categoryId; // Kategori ataması
                    await _repository.AddAsync(task);
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    result.SkippedCount++;
                    result.Errors.Add($"Satır {lineNumber}: {ex.Message} → \"{rawLine}\"");
                }
            }

            return result;
        }

        // ---------------------------------------------------------------
        // YARDIMCI: SATIR PARSE
        // ---------------------------------------------------------------

        /// <summary>
        /// Tek bir satırı parse ederek TaskItem döndürür.
        /// Herhangi bir alan geçersizse FormatException fırlatır.
        /// </summary>
        private static TaskItem ParseLine(string line, int lineNumber)
        {
            // Formatı: 2026-07-15 | Z | ROMENCE_KURS | 1 | 45 | Romence Video 1 İzle
            string[] parts = line.Split(Delimiter);

            if (parts.Length < FieldCount)
                throw new FormatException(
                    $"Beklenen alan sayısı {FieldCount}, bulunan: {parts.Length}");

            // 1) Tarih: yyyy-MM-dd (opsiyonel — boşsa null kalır)
            string rawDate = parts[IdxDate].Trim();
            DateTime? dueDate = null;
            if (!string.IsNullOrEmpty(rawDate))
            {
                if (!DateTime.TryParseExact(
                        rawDate,
                        "yyyy-MM-dd",
                        System.Globalization.CultureInfo.InvariantCulture,
                        System.Globalization.DateTimeStyles.None,
                        out DateTime parsedDate))
                    throw new FormatException(
                        $"Geçersiz tarih formatı: '{rawDate}'. Beklenen: yyyy-MM-dd");

                dueDate = parsedDate;
            }

            // 2) Görev Tipi: B → Bağımsız (0), Z → Zincirleme (1)
            string rawType = parts[IdxType].Trim().ToUpperInvariant();
            TaskType taskType = rawType switch
            {
                "B" => TaskType.Bağımsız,
                "Z" => TaskType.Zincirleme,
                _   => throw new FormatException(
                           $"Geçersiz görev tipi: '{rawType}'. 'B' veya 'Z' olmalı.")
            };

            // 3) ChainId: Zincirleme görevlerde dolu olmalı
            string chainId = parts[IdxChainId].Trim();
            if (taskType == TaskType.Zincirleme && string.IsNullOrEmpty(chainId))
                throw new FormatException(
                    "Zincirleme görevlerde ChainId boş olamaz.");

            // 4) Sıra Numarası (OrderIndex)
            string rawOrder = parts[IdxOrder].Trim();
            if (!int.TryParse(rawOrder, out int orderIndex) || orderIndex < 0)
                throw new FormatException(
                    $"Geçersiz sıra numarası: '{rawOrder}'. Negatif olmayan tamsayı olmalı.");

            // 5) Yaklaşık Süre (EstimatedTime) (opsiyonel)
            string rawEstTime = parts[IdxEstTime].Trim();
            int? estimatedTime = null;
            if (!string.IsNullOrEmpty(rawEstTime))
            {
                if (!int.TryParse(rawEstTime, out int parsedTime) || parsedTime < 0)
                    throw new FormatException(
                        $"Geçersiz süre değeri: '{rawEstTime}'. Negatif olmayan bir tamsayı olmalı.");
                
                estimatedTime = parsedTime;
            }

            // 6) Görev Başlığı
            // Başlıkta '|' karakteri bulunabilir: kalan tüm parçaları birleştir
            string title = string.Join(Delimiter, parts[IdxTitle..]).Trim();
            if (string.IsNullOrEmpty(title))
                throw new FormatException("Görev başlığı boş olamaz.");

            // ---------------------------------------------------------------
            // Yeni TaskItem oluştur
            // ---------------------------------------------------------------
            return new TaskItem
            {
                Title         = title,
                DueDate       = dueDate,
                IsCompleted   = false,
                TaskType      = taskType,
                ChainId       = string.IsNullOrEmpty(chainId) ? null : chainId,
                OrderIndex    = orderIndex,
                EstimatedTime = estimatedTime
            };
        }
    }
}
