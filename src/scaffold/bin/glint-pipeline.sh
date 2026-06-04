#!/usr/bin/env bash
#
# glint-pipeline.sh — headless orchestrator for the Glint content pipeline.
#
# Subscription Login Prerequisite:
# This script relies on your logged-in subscriptions (claude, gemini/Antigravity, codex)
# and does NOT require or use metered API keys (e.g. GEMINI_API_KEY, ANTHROPIC_API_KEY).
# Run "claude login", "gemini login", and "codex login" before running this script.
# Do NOT run this on hosted GitHub runners; use a local machine or a self-hosted runner.
#

set -euo pipefail

# Helper to verify tool availability
check_tool() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: $1 CLI is not installed or not in PATH."
    echo "Please ensure you have installed $1 and logged in."
    exit 1
  fi
}

print_usage() {
  echo "Usage: $0 {plan|draft|images|review|ship|batch}"
  echo "  plan:          Propose new content ideas"
  echo "  draft <topic>: Create a draft post on a new branch"
  echo "  images <slug>: Generate images for the post"
  echo "  review <slug>: Run Claude + Codex review on the draft"
  echo "  ship <slug>:   Perform final gate check before PR"
  echo "  batch <N>:     Batch process N approved items using worktrees"
}

require_repo_file() {
  path="$1"
  hint="$2"
  if [ ! -e "$path" ]; then
    echo "Error: expected $path in the current repo."
    echo "$hint"
    exit 1
  fi
}

require_post_file() {
  slug="$1"
  stage="$2"
  path="content/blog/$slug.md"
  if [ ! -f "$path" ]; then
    echo "Error: $stage expects $path to exist."
    echo "Run '$0 draft <topic>' first, or pass the slug of an existing draft."
    exit 1
  fi
}

validate_batch_count() {
  count="$1"
  case "$count" in
    ''|*[!0-9]*)
      echo "Error: batch count must be a positive integer."
      print_usage
      exit 1
      ;;
    0)
      echo "Error: batch count must be greater than 0."
      exit 1
      ;;
  esac
}

check_tool pnpm
require_repo_file ".git" "Run this from the root of a Glint site repo."
require_repo_file "docs/pipeline" "Run 'pnpm glint sync' if the pipeline docs have not been scaffolded yet."
require_repo_file "docs/pipeline/plan.md" "Run 'pnpm glint sync' if the pipeline plays are missing."

run_gemini_play() {
  stage="$1"
  label="${2:-}"
  value="${3:-}"

  if [ -n "$label" ] && [ -n "$value" ]; then
    gemini -p "$(cat "docs/pipeline/${stage}.md")

${label}: ${value}"
  else
    gemini -p "$(cat "docs/pipeline/${stage}.md")"
  fi
}

run_review_play() {
  slug="$1"

  check_tool claude
  check_tool codex
  echo "=== Running Claude Review ==="
  claude -p "$(cat docs/pipeline/review.md)

Slug: $slug
Reviewer: Claude"
  echo "=== Running Codex Review ==="
  codex exec "Run docs/pipeline/review.md for $slug with Reviewer: Codex"
}

commit_if_needed() {
  message="$1"
  git add -A
  if [ -n "$(git status --porcelain)" ]; then
    git commit -m "$message"
  else
    echo "No new changes to commit for: $message"
  fi
}

branch_exists_local() {
  slug="$1"
  git show-ref --verify --quiet "refs/heads/content/$slug"
}

branch_exists_remote() {
  slug="$1"
  git remote get-url origin &> /dev/null || return 1
  git ls-remote --exit-code --heads origin "content/$slug" &> /dev/null
}

content_exists() {
  slug="$1"
  [ -f "content/blog/$slug.md" ]
}

cmd="${1:-}"
shift || true

case "$cmd" in
  ""|-h|--help|help)
    print_usage
    ;;

  plan)
    echo "Running Play: plan..."
    check_tool gemini
    run_gemini_play "plan"
    ;;

  draft)
    topic="${1:-}"
    if [ -z "$topic" ]; then
      echo "Usage: $0 draft <topic|slug>"
      exit 1
    fi
    echo "Running Play: draft for '$topic'..."
    check_tool gemini
    run_gemini_play "draft" "Topic" "$topic"
    ;;

  images)
    slug="${1:-}"
    if [ -z "$slug" ]; then
      echo "Usage: $0 images <slug>"
      exit 1
    fi
    echo "Running Play: images for '$slug'..."
    check_tool gemini
    require_post_file "$slug" "images"
    run_gemini_play "images" "Slug" "$slug"
    ;;

  review)
    slug="${1:-}"
    if [ -z "$slug" ]; then
      echo "Usage: $0 review <slug>"
      exit 1
    fi
    echo "Running Play: review (cross-check) for '$slug'..."
    require_post_file "$slug" "review"
    run_review_play "$slug"
    ;;

  ship)
    slug="${1:-}"
    if [ -z "$slug" ]; then
      echo "Usage: $0 ship <slug>"
      exit 1
    fi
    echo "Running Play: ship for '$slug'..."
    require_post_file "$slug" "ship"
    pnpm glint doctor --strict
    pnpm glint status
    if [ -f docs/blog-review-checklist.md ]; then
      cat docs/blog-review-checklist.md
    fi
    echo ""
    echo "Next: run \`pnpm glint preview\` locally, review the draft, then push/open a PR when it looks right."
    ;;

  batch)
    count="${1:-}"
    if [ -z "$count" ]; then
      echo "Usage: $0 batch <N>"
      exit 1
    fi
    validate_batch_count "$count"
    echo "Running batch processing for next $count approved content-plan items..."
    
    approved_file="data/content-plan.md"
    if [ ! -f "$approved_file" ]; then
      echo "Error: $approved_file not found."
      exit 1
    fi

    # Read up to count approved items starting with "- [approved]"
    items=$(grep -E '^\s*-\s*\[approved\]' "$approved_file" | head -n "$count" || true)
    if [ -z "$items" ]; then
      echo "No approved items found in $approved_file."
      exit 0
    fi

    # Check for gh CLI and remote
    has_gh=true
    if ! command -v gh &> /dev/null; then
      echo "Warning: gh CLI not found. Falling back to single-branch mode (no PR creation)."
      has_gh=false
    fi
    if ! git remote get-url origin &> /dev/null; then
      echo "Warning: No git remote found. Falling back to single-branch mode (no push)."
      has_gh=false
    fi

    # Process each item
    created=0
    skipped=0
    IFS=$'\n'
    for item in $items; do
      # Extract title: everything after the second ' · ' and before ' — ' or ' - ' or end of line.
      title=$(echo "$item" | sed -E 's/^.* · [^·]+ · //; s/ [—-].*$//' | xargs)
      slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | sed -E 's/^-+|-+$//g')
      
      echo "---------------------------------------"
      echo "Processing: $title (slug: $slug)"

      if content_exists "$slug"; then
        echo "Skipping $slug: content/blog/$slug.md already exists in this checkout."
        skipped=$((skipped + 1))
        continue
      fi
      if branch_exists_local "$slug"; then
        echo "Skipping $slug: local branch content/$slug already exists."
        skipped=$((skipped + 1))
        continue
      fi
      if [ "$has_gh" = true ] && branch_exists_remote "$slug"; then
        echo "Skipping $slug: remote branch content/$slug already exists."
        skipped=$((skipped + 1))
        continue
      fi
      if [ -z "$slug" ]; then
        echo "Skipping malformed backlog item: $item"
        skipped=$((skipped + 1))
        continue
      fi
      
      if [ "$has_gh" = true ]; then
        worktree_dir=$(mktemp -d "${TMPDIR:-/tmp}/glint-pipeline-${slug}-XXXXXX")
        rmdir "$worktree_dir"
        echo "Creating worktree at $worktree_dir on branch content/$slug..."
        git worktree prune || true
        git worktree add -b "content/$slug" "$worktree_dir"

        status=0
        (
          cd "$worktree_dir"
          check_tool gemini
          run_gemini_play "draft" "Topic" "$title"
          run_gemini_play "images" "Slug" "$slug"
          run_review_play "$slug"
          commit_if_needed "Draft: $title"
          git push -u origin "content/$slug"
          gh pr create --title "Draft: $title" --body "Automated draft via content pipeline" --draft
        ) || status=$?

        if [ "$status" -eq 0 ]; then
          git worktree remove "$worktree_dir" > /dev/null 2>&1 || true
        else
          echo "Pipeline failed for $slug. Inspect the preserved worktree at: $worktree_dir"
        fi
        if [ "$status" -ne 0 ]; then
          exit "$status"
        fi
      else
        if [ -n "$(git status --porcelain)" ]; then
          echo "Error: batch mode without gh requires a clean working tree before switching branches."
          exit 1
        fi
        original_branch=$(git branch --show-current)
        git checkout -b "content/$slug" 2>/dev/null || git checkout "content/$slug"

        check_tool gemini
        run_gemini_play "draft" "Topic" "$title"
        run_gemini_play "images" "Slug" "$slug"
        run_review_play "$slug"
        commit_if_needed "Draft: $title"

        echo "Draft created on branch content/$slug. Review it locally, then push/open a PR manually."
        git checkout "$original_branch"
      fi
      created=$((created + 1))
    done
    echo ""
    echo "Batch complete: $created created, $skipped skipped."
    ;;

  *)
    print_usage
    exit 1
    ;;
esac
