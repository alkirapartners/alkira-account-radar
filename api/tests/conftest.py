import os
import pytest

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("RADAR_DAILY_BATCH_LIMIT", "5")
os.environ.setdefault("RADAR_MAX_BATCH_SIZE", "40")
os.environ.setdefault("RADAR_AGENT_CONCURRENCY", "8")


@pytest.fixture
def partner_email():
    return "partner@example.com"
