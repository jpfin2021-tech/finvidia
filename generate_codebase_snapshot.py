import os
import subprocess
import sys

# Target directories and standalone files to map
TARGET_DIRS = ['app', 'components', 'lib']
TARGET_FILES = ['package.json', 'next.config.ts', 'next.config.mjs', 'next.config.js']
SKIP_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.ico', '.svg', '.woff', '.woff2', '.webp', '.db'}
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'codebase_snapshot.txt')

def open_file_on_screen(file_path):
    try:
        if os.name == 'nt':
            os.startfile(file_path)
        elif sys.platform == 'darwin':
            subprocess.run(['open', file_path])
        else:
            subprocess.run(['xdg-open', file_path])
    except Exception:
        pass

def main():
    base_dir = os.path.dirname(__file__)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("==================================================\n")
        out.write("FININDIA CODEBASE SNAPSHOT (COMMIT 24f8dd9)\n")
        out.write("==================================================\n\n")

        # 1. DIRECTORY TREE
        out.write("--- 1. PROJECT STRUCTURE ---\n")
        for root, dirs, files in os.walk(base_dir):
            # Exclude node_modules, .next, .git
            dirs[:] = [d for d in dirs if d not in {'node_modules', '.next', '.git', '__pycache__'}]
            rel_path = os.path.relpath(root, base_dir)
            if rel_path == '.':
                out.write(".\n")
            else:
                out.write(f"{rel_path}/\n")
            for f in files:
                if not any(f.endswith(ext) for ext in SKIP_EXTENSIONS):
                    out.write(f"  ├── {f}\n")
        out.write("\n\n")

        # 2. FILE CONTENTS
        out.write("--- 2. FILE CONTENTS ---\n\n")

        # Process standalone config files
        for f_name in TARGET_FILES:
            full_p = os.path.join(base_dir, f_name)
            if os.path.exists(full_p):
                out.write(f"==================================================\n")
                out.write(f"FILE: {f_name}\n")
                out.write(f"==================================================\n")
                try:
                    with open(full_p, 'r', encoding='utf-8', errors='ignore') as f:
                        out.write(f.read())
                except Exception as e:
                    out.write(f"Error reading file: {e}\n")
                out.write("\n\n")

        # Process targeted source folders
        for d_name in TARGET_DIRS:
            target_path = os.path.join(base_dir, d_name)
            if os.path.exists(target_path):
                for root, _, files in os.walk(target_path):
                    for f_name in files:
                        ext = os.path.splitext(f_name)[1].lower()
                        if ext in SKIP_EXTENSIONS:
                            continue
                        
                        full_p = os.path.join(root, f_name)
                        rel_p = os.path.relpath(full_p, base_dir)
                        
                        out.write(f"==================================================\n")
                        out.write(f"FILE: {rel_p}\n")
                        out.write(f"==================================================\n")
                        try:
                            with open(full_p, 'r', encoding='utf-8', errors='ignore') as f:
                                out.write(f.read())
                        except Exception as e:
                            out.write(f"Error reading file: {e}\n")
                        out.write("\n\n")

    print(f"✅ Codebase snapshot successfully written to: '{OUTPUT_FILE}'")
    open_file_on_screen(OUTPUT_FILE)

if __name__ == "__main__":
    main()