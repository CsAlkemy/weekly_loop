from app.config.env import settings
from app.realtime.router import allowed_origin


def test_the_configured_web_origin_is_allowed():
    for origin in settings.web_origins:
        assert allowed_origin(origin, "api:8000")


def test_a_page_served_from_another_address_of_the_same_app_is_allowed():
    assert allowed_origin("http://127.0.0.1:3000", "127.0.0.1:3000")
    assert allowed_origin("http://192.168.1.20:3000", "192.168.1.20:3000")


def test_another_site_is_refused():
    assert not allowed_origin("https://evil.example", "127.0.0.1:3000")
    assert not allowed_origin("http://127.0.0.1:3001", "127.0.0.1:3000")
    assert not allowed_origin(None, "127.0.0.1:3000")
