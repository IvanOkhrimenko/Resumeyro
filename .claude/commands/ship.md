---
description: Commit all changes and push to GitHub
allowed-tools: Bash(git:*), Bash(cd:*)
argument-hint: [commit message]
---

# Ship Code to GitHub

Commit all changes and push them to the remote repository.

## Context
- Current git status: !`cd task-helper && git status --short`
- Current branch: !`cd task-helper && git branch --show-current`

## Instructions

1. First, navigate to the task-helper directory where the git repo is located
2. Check if there are any changes to commit using `git status`
3. If there are changes:
   - Stage all changes with `git add -A`
   - Create a commit with the message provided in $ARGUMENTS (or generate a descriptive commit message based on the changes if none provided)
   - Push to the remote repository
4. If there are no changes, inform the user that there's nothing to commit

**Important:** All git commands must be run from the `task-helper/` directory.

## Commit Message Format

If no commit message is provided, analyze the staged changes and create a concise, descriptive commit message following conventional commit format when appropriate.

Always append the following footer to the commit message:

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
