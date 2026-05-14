#!/usr/bin/env python3
"""Push files to GitHub repository using the Contents API."""
import base64
import json
import os
import sys
import urllib.parse
import urllib.request
import urllib.error

REPO = "sriraajj-lab/Launchpilot"
BRANCH = "main"
API_BASE = f"https://api.github.com/repos/{REPO}/contents"

# Files to push (path -> remote_sha, None if new file)
FILES = {
    ".github/workflows/deploy-azure.yml": "c3cdc5dfbbdbfe9cbaf54d58b362200bbc9e632e",
    "Dockerfile": "89d07ea59fc1b9544df5ff5a1c03a6db00e3c626",
    "package-lock.json": "81b6f6facb4c1b9d6fcea110072d9b765d1a9ab5",
    "prisma/migrations/20260514_add_action_fields/migration.sql": None,  # New file
    "prisma/schema.prisma": "42f5d84b7e5f76ae020ca982be07d4f24778124a",
    "src/app/api/campaigns/[id]/submissions/[submissionId]/route.ts": None,  # New file
    "src/app/campaigns/[id]/page.tsx": "47ed6bff24e684491f92d15556ef27816934bc8e",
    "src/lib/automation/server-engine.ts": "3775fbde891db98f0ebb6bf5e562286119f0ceb9",
    "src/lib/queue/worker.ts": "9b0a1aa118197093f9565126f9b2f1de36b179c8",
    "start-worker.sh": None,  # New file
}

SOURCE_DIR = "/home/z/launchpilot-repo"

def push_file(token, filepath, remote_sha):
    """Push a single file to GitHub using the Contents API."""
    full_path = os.path.join(SOURCE_DIR, filepath)
    
    with open(full_path, "rb") as f:
        content = base64.b64encode(f.read()).decode("utf-8")
    
    encoded_path = urllib.parse.quote(filepath, safe="/")
    url = f"{API_BASE}/{encoded_path}"
    
    payload = {
        "message": f"feat: update {filepath}",
        "content": content,
        "branch": BRANCH,
    }
    
    if remote_sha:
        payload["sha"] = remote_sha
    
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "launchpilot-push-script",
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="PUT")
    
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            print(f"  ✓ {filepath} (commit: {result.get('commit', {}).get('sha', 'N/A')[:7]})")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  ✗ {filepath} (HTTP {e.code}: {body[:200]})")
        return False

def main():
    # Get token from command line arg or environment
    if len(sys.argv) > 1:
        token = sys.argv[1]
    else:
        token = os.environ.get("GITHUB_TOKEN", "")
    
    if not token:
        print("ERROR: No GitHub token provided!")
        print("Usage: python3 push_to_github.py <GITHUB_TOKEN>")
        print("   or: GITHUB_TOKEN=<token> python3 push_to_github.py")
        sys.exit(1)
    
    print(f"Pushing {len(FILES)} files to {REPO}:{BRANCH}...")
    
    success = 0
    failed = 0
    for filepath, remote_sha in FILES.items():
        status = "update" if remote_sha else "create"
        print(f"  [{status}] {filepath}...")
        if push_file(token, filepath, remote_sha):
            success += 1
        else:
            failed += 1
    
    print(f"\nDone: {success} succeeded, {failed} failed out of {len(FILES)} files")

if __name__ == "__main__":
    main()
