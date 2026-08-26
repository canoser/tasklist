import requests
import json
import uuid

BASE_URL = "https://dersmatris-api.fly.dev/api"

def get_auth_token():
    email = f"hacker_test_{uuid.uuid4().hex[:8]}@example.com"
    print(f"[*] 1. Yeni kullanıcı oluşturuluyor: {email}")
    register_data = {
        "email": email,
        "password": "Password123!",
        "name": "R2 Test"
    }
    res = requests.post(f"{BASE_URL}/Auth/register", json=register_data)
    if res.status_code == 200:
        return res.json().get('token')
    print(f"[-] Backend hatası: {res.status_code} - {res.text}")
    return None

def test_r2_presigned_url(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    print("[*] 2. Backend'den R2 Presigned URL isteniyor (test_image.jpg)...")
    payload = {
        "workspaceId": 1,
        "fileName": "test_image.jpg",
        "contentType": "image/jpeg",
        "fileSizeInBytes": 1024 * 50 # 50 KB
    }
    
    res = requests.post(f"{BASE_URL}/Storage/upload-url", json=payload, headers=headers)
    
    if res.status_code == 200:
        data = res.json()
        upload_url = data.get("uploadUrl")
        file_key = data.get("fileKey")
        print(f"[+] Başarılı! R2 Linki Üretildi.\n    FileKey: {file_key}\n    URL: {upload_url[:60]}...")
        
        print(f"[*] 3. Doğrudan Cloudflare R2'ye dosya yükleniyor (Backend'i atlayarak)...")
        # Gerçek bir PUT isteği atıyoruz
        dummy_file_data = b"This is a test image content for R2"
        put_headers = {"Content-Type": "image/jpeg"}
        
        upload_res = requests.put(upload_url, data=dummy_file_data, headers=put_headers)
        
        if upload_res.status_code == 200:
            print("[+] MÜKEMMEL! Cloudflare R2 dosyayı kabul etti ve app-dersmatris kovanına kaydetti!")
        else:
            print(f"[-] R2 Yüklemesi Başarısız: {upload_res.status_code} - {upload_res.text}")
    else:
        print(f"[-] Backend URL üretemedi: {res.status_code} - {res.text}")

if __name__ == "__main__":
    token = get_auth_token()
    if token:
        test_r2_presigned_url(token)
    else:
        print("[-] Token alınamadı, Backend çalışmıyor olabilir.")
