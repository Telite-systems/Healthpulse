import requests
import sys

# Ensure UTF-8 output if supported, otherwise safely ignore emojis
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8000"

def test():
    # Login
    print("Attempting login...")
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": "doctor",
        "password": "doctor123"
    })
    print("Login Status:", r.status_code)
    print("Login Headers:", dict(r.headers))
    try:
        print("Login Response keys:", list(r.json().keys()))
        print("Login Response data keys:", list(r.json()["data"].keys()))
        print("Login User name:", r.json()["data"]["user"]["name"])
    except Exception as e:
        print("Error parsing login response:", e)
        print("Raw response text:", r.text)
        
    if r.status_code != 200:
        return
        
    data = r.json()
    token = data["data"]["token"]
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    # Call /api/vendors
    print("Calling /api/vendors...")
    r_vendors = requests.get(f"{BASE_URL}/api/vendors", headers=headers)
    print("Vendors Status:", r_vendors.status_code)
    print("Vendors Headers:", dict(r_vendors.headers))
    print("Vendors Response:", r_vendors.text)

if __name__ == "__main__":
    test()
