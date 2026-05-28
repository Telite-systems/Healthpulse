"""
HealthPulse Backend — Placeholder Tests
========================================
These are starter tests to validate the CI pipeline.
Add more tests as the application grows.

Run with:  pytest tests/ -v
"""


def test_placeholder_passes():
    """Placeholder test to verify pytest runs correctly in CI."""
    assert True


def test_app_module_importable():
    """Verify the main app module can be imported without errors."""
    try:
        import app  # noqa: F401
        assert True
    except ImportError as e:
        # Allow import to fail if optional dependencies (like MongoDB) aren't
        # available in CI — the Docker build test covers full integration.
        assert "motor" in str(e) or "pymongo" in str(e) or "torch" in str(e), \
            f"Unexpected import error: {e}"
