import os
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PARENT_DIR = os.path.abspath(os.path.join(ROOT_DIR, os.pardir))
for path in (ROOT_DIR, PARENT_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)
