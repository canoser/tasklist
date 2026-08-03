import sqlite3
import datetime
import sys
import json
import uuid

DB_PATH = "WebApp/Backend/PlanlamaApp.Api/PlanlamaApp.db"

def seed_mock_tasks(user_id, tenant_id="default"):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    today = datetime.datetime.now()
    
    mock_tasks = [
        {
            "Title": "Matematik Türev Konu Tekrarı",
            "Description": "Fasikülden türev kurallarını tekrar et.",
            "TaskType": "Okuma",
            "Deadline": today.replace(hour=14, minute=0, second=0, microsecond=0),
            "TargetCount": 1,
            "IsTeacherAssigned": 1
        },
        {
            "Title": "Fizik Newton Yasaları Soru Çözümü",
            "Description": "Test kitabındaki ilk 3 testi bitir.",
            "TaskType": "Soru Çözme",
            "Deadline": today.replace(hour=16, minute=30, second=0, microsecond=0),
            "TargetCount": 45,
            "IsTeacherAssigned": 0
        },
        {
            "Title": "Tarih Kurtuluş Savaşı Özeti",
            "Description": "Video ders notlarından oku.",
            "TaskType": "Okuma",
            "Deadline": (today + datetime.timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0),
            "TargetCount": 2,
            "IsTeacherAssigned": 1
        },
        {
            "Title": "Türkçe Paragraf Denemesi",
            "Description": "Süre tutarak 30 soru çöz.",
            "TaskType": "Deneme",
            "Deadline": (today + datetime.timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0),
            "TargetCount": 30,
            "IsTeacherAssigned": 0
        }
    ]

    insert_query = """
    INSERT INTO TaskItems 
    (TenantId, UserId, CategoryId, Title, Description, TaskType, 
     Deadline, IsTeacherAssigned, IsCompleted, CompletedAt, TargetCount, Metadata, CreatedAt, UpdatedAt)
    VALUES 
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    count = 0
    for task in mock_tasks:
        created_at = datetime.datetime.utcnow().isoformat()
        deadline_str = task["Deadline"].isoformat()
        
        cursor.execute(insert_query, (
            tenant_id,
            user_id,
            None, # CategoryId
            task["Title"],
            task["Description"],
            task["TaskType"],
            deadline_str,
            task["IsTeacherAssigned"],
            0, # IsCompleted
            None, # CompletedAt
            task["TargetCount"],
            json.dumps({"source": "python_seed"}),
            created_at,
            created_at
        ))
        count += 1

    conn.commit()
    conn.close()
    
    print(f"✅ {count} adet mock görev '{user_id}' kullanıcısı için veritabanına eklendi!")
    print("Değişiklikleri görmek için uygulamayı yenileyebilirsiniz.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python create_mock_tasks.py <USER_ID>")
        print("Örnek: python create_mock_tasks.py wxyZA123...")
        sys.exit(1)
        
    user_id_arg = sys.argv[1]
    seed_mock_tasks(user_id_arg)
