from app.main import app

for route in app.routes:
    print(f"PATH: {route.path} | METHODS: {route.methods if hasattr(route, 'methods') else 'N/A'}")
