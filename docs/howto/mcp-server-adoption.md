# GitHub MCP Server Adoption

The official GitHub MCP server (`github/github-mcp-server`) is the standard
GitHub tool surface across Claude Code, Copilot, and Codex teams.

## Why MCP over `gh` CLI

- **Uniform surface**: Issues, PRs, Discussions, Projects v2, Sub-issues, Actions,
  and Repositories all exposed as MCP tools — no per-team adapter drift.
- **Tool-call observability**: MCP tool calls are visible to harness telemetry
  in the same shape across runtimes.
- **Schema-validated arguments**: MCP servers enforce typed inputs; `gh` CLI
  string args bypass type-checking.

## Activation

1. Install the GitHub MCP server (per https://github.com/github/github-mcp-server).
2. Set `GITHUB_TOKEN` (or `GITHUB_PERSONAL_ACCESS_TOKEN`). Every operator with
   `gh auth status` already has one.
3. Register the server in the team's MCP config:
   - Claude Code: `.claude/mcp-servers.json` (per-project) or user-level.
   - Copilot: `.github/copilot-mcp.json` (per-project).
   - Codex: `~/.codex/mcp-servers.json`.
4. Restart the runtime so the new server registers.

## Opt-out

Set `MEGINGJORD_MCP_DISABLED=1` for air-gapped or restricted operators. Skills
detect the env var and fall back to `gh` CLI without behavior change.

## Example baton flow via MCP

Replace each step with MCP tool calls (canonical tool names):

| Step | `gh` CLI | MCP tool |
|---|---|---|
| Open issue | `gh issue create --title X --body Y` | `mcp__github__create_issue` |
| Add comment | `gh issue comment N --body Y` | `mcp__github__create_issue_comment` |
| Edit labels | `gh issue edit N --add-label X` | `mcp__github__update_issue` |
| Open PR | `gh pr create --title X --body Y` | `mcp__github__create_pull_request` |
| List checks | `gh pr checks N` | `mcp__github__list_workflow_runs` |
| Merge PR | `gh pr merge N --merge` | `mcp__github__merge_pull_request` |

## Portability notes (per G5 contract)

- GitHub MCP server requires network access to `api.github.com`. Air-gapped
  operators have no GitHub access at baseline; MCP server's absence is consistent
  with their existing constraints — no fallback required for the network gap.
- Operators on plan tiers without Projects v2 access continue with their existing
  Issue-driven flows; MCP server's `mcp__github__projects_*` tools silently
  return permission errors that skills gracefully degrade past.

## Related

- `instructions/global-standards.instructions.md` (cross-team tool surface)
- `instructions/github-governance.instructions.md` (MCP-server section)
- `instructions/harness-goals.instructions.md` G5 Portability contract (#1628)
- `docs/howto/baton-workflow.md` (the baton steps the MCP tools support)
