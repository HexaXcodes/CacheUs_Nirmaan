import os
import sys

# Reconfigure stdout to use UTF-8 to prevent UnicodeEncodeError on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure workspace root and AI directory are in the Python path
ai_dir = os.path.dirname(os.path.abspath(__file__))
workspace_root = os.path.dirname(ai_dir)
if workspace_root not in sys.path:
    sys.path.insert(0, workspace_root)
if ai_dir not in sys.path:
    sys.path.insert(0, ai_dir)

from voice_triage.pipeline import run_voice_triage

if __name__ == "__main__":
    sample_path = os.path.join(os.path.dirname(__file__), "sample_audio", "test.wav")

    if not os.path.exists(sample_path):
        print("❌ No test.wav found in AI/sample_audio/")
        print("👉 Please add a real .wav file to test the pipeline.")
    else:
        result = run_voice_triage(sample_path)
        print("\n✅ Voice Triage Result:\n")
        for key, value in result.items():
            print(f"{key}: {value}")
