---
title: Just Sidebar
description: A VS Code extension that surfaces just recipes in a persistent sidebar tree view, with click-to-run support and multi-justfile workspaces.
repo: https://github.com/pike00/just-sidebar
tags: ["VS Code", "TypeScript", "just"]
date: "2026-04-14"
---

A VS Code extension that lists the recipes from a [`just`](https://github.com/casey/just) file in a dedicated sidebar tree view. Click any recipe to run it in an integrated terminal, or use "Run with Args" for parameterized recipes.

## Features

- **Sidebar tree view** under a "Just" activity bar icon, with recipes grouped by justfile
- **Click to run** — single click sends the recipe to a reusable terminal
- **Doc comments** — recipe descriptions pulled from `# comment` lines above each recipe
- **Multi-justfile workspaces** — selector lets you switch between justfiles; the choice persists across reloads
- **Nix support** — optionally wraps `just` with `nix develop --command` when a `flake.nix` sits next to the justfile
- **File watcher** — the tree refreshes automatically when a justfile is saved
- **Workspace Trust aware** — recipes are hidden in untrusted workspaces

## Why

I use `just` heavily as a task runner across almost every repo I work in, and the existing VS Code extensions for it either render recipes as a flat palette or require the command palette round-trip. I wanted a persistent panel I could glance at — the same place I already look for files and source control.
