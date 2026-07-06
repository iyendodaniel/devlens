import sys
import os
import webview
from api import DevLensAPI


def resource_path(*parts: str) -> str:
    """Resolve a path both in normal `python main.py` runs and inside a
    PyInstaller-bundled .exe.

    Dev mode: frontend/ is a sibling of this backend/ folder, so we look
    one directory up (matches the original "../frontend/dist/index.html").
    Frozen mode: PyInstaller unpacks everything under sys._MEIPASS, and
    --add-data "..\\frontend\\dist;frontend/dist" puts it directly at
    <_MEIPASS>/frontend/dist - no "one level up" needed there.
    """
    if getattr(sys, "frozen", False):
        base = sys._MEIPASS  # type: ignore[attr-defined]
        return os.path.join(base, *parts)
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, *parts)


def main():
    api = DevLensAPI()
    url = resource_path("frontend", "dist", "index.html")
    window = webview.create_window(
        "DevLens",
        url,
        js_api=api,
        frameless=True,
        easy_drag=False,
        background_color="#0f0f0f",
        min_size=(960, 600),
    )
    api._window = window  # underscore matters here - see note in api.py
    webview.start()

if __name__ == "__main__":
    main()