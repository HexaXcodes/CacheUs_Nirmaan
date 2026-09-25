import os
import zipfile

def create_zip_archive():
    # Sibling folder path (which is the current directory of this script)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    zip_name = "rppg_ai_service.zip"
    zip_path = os.path.join(current_dir, zip_name)
    
    print(f"Creating ZIP archive in: {zip_path}")
    
    # Files and folders to exclude from the zip file
    exclude_dirs = {".venv", "venv", ".pytest_cache", "__pycache__", ".git"}
    exclude_files = {zip_name}
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(current_dir):
            # Modify dirs in-place to skip excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files:
                    continue
                if file.endswith(('.pyc', '.pyo', '.pyd')):
                    continue
                    
                full_path = os.path.join(root, file)
                # Compute relative path to preserve directory structure in zip
                rel_path = os.path.relpath(full_path, current_dir)
                zipf.write(full_path, rel_path)
                print(f"Added: {rel_path}")
                
    print(f"\nSuccessfully packaged into: {zip_name}")

if __name__ == "__main__":
    create_zip_archive()
