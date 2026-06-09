from fastapi.testclient import TestClient
from app.main import app
from app.services.auth import get_current_user

# Mock get_current_user dependency
async def override_get_current_user():
    return {
        "id": "PD048CA",
        "username": "shiva06",
        "name": "Shivansh Negi",
        "role": "Patient"
    }

app.dependency_overrides[get_current_user] = override_get_current_user

def test_fetch():
    # 'with' context manager runs the startup event which connects to MongoDB on the TestClient loop!
    with TestClient(app) as client:
        response = client.get("/api/prescriptions/patient/PD048CA")
        print("STATUS:", response.status_code)
        print("RESPONSE JSON:", response.json())

if __name__ == '__main__':
    test_fetch()
