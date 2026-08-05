"""
Shared pytest configuration & fixtures.

Provides a Windows-safe ``tmp_path`` replacement so that tests don't fail
with ``PermissionError: [WinError 5]`` during pytest's temp-dir cleanup.
"""

import os
import shutil
import tempfile
import uuid

import pytest


@pytest.fixture
def tmp_path(request):
    """
    Drop-in replacement for pytest's built-in ``tmp_path`` fixture.

    On Windows, the default ``tmp_path`` fixture sporadically fails during
    cleanup because the OS keeps handles open on recently-written files.
    This fixture creates a unique temp dir under the project's ``.tmp/``
    folder and performs a best-effort cleanup with retries.
    """
    base = os.path.join(os.path.dirname(__file__), "..", ".tmp", "tests")
    os.makedirs(base, exist_ok=True)
    path = os.path.join(base, f"{request.node.name}_{uuid.uuid4().hex[:8]}")
    os.makedirs(path, exist_ok=True)
    from pathlib import Path
    yield Path(path)
    # Best-effort cleanup — tolerate Windows permission errors
    try:
        shutil.rmtree(path, ignore_errors=True)
    except Exception:
        pass
