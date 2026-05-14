# HAMR Activation

Run HAMR activation once per checkout:

```bash
npm run hamr:activate
```

The activator supports normal clones and linked Git worktrees. Hook installation
uses Git's resolved hooks path, so a worktree with a `.git` file is valid.

Set `HAMR_TEAM` when activating for a specific runtime:

```bash
HAMR_TEAM=codex npm run hamr:activate
HAMR_TEAM=claude-code npm run hamr:activate
HAMR_TEAM=copilot npm run hamr:activate
```

Provider key checks follow the runtime unless `HAMR_PROVIDER` overrides them:

| Runtime or Provider | Activation Key Check |
|---------------------|----------------------|
| `HAMR_TEAM=codex` | `OPENAI_API_KEY` |
| `HAMR_TEAM=claude-code` | `ANTHROPIC_API_KEY` |
| `HAMR_PROVIDER=openrouter` | `OPENROUTER_API_KEY` |
| `HAMR_PROVIDER=provider-neutral` | no cloud key required |
| `HAMR_PROVIDER=fleet` or `ollama` | no cloud key required |

Missing keys warn but do not block offline or local-only work. HAMR Worker push
steps skip until the required operator/provider key is available.

Signed-by: Quill Harper
Team&Model: codex:gpt-5.4@codex-cli
Role: collaborator
