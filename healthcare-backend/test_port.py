import uvicorn
import threading
import time
import requests
from app.main import app

def run_server():
    uvicorn.run(app, host="127.0.0.1", port=8005, log_level="warning")

def test():
    # Start server in a background thread
    t = threading.Thread(target=run_server, daemon=True)
    t.start()
    
    # Wait for server to start
    time.sleep(2)
    
    print("Testing /api/vendors on port 8005...")
    # Call without auth first to see if we get 401 (which means route exists) or 404
    r = requests.get("http://127.0.0.1:8005/api/vendors")
    print("Status code:", r.status_code)
    print("Headers:", dict(r.headers))
    print("Response:", r.text)

if __name__ == "__main__":
    test()
