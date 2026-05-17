'use strict';
// github-dispatcher (#1643 + #1710 execute layer) — MCP-vs-gh-CLI dispatcher.
// dispatch() returns selection metadata; execute() actually invokes the chosen
// provider. Per #1629 contract, fallback to gh CLI when MCP unavailable.

const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

function provider(env = process.env) {
  if (env.MEGINGJORD_MCP_DISABLED === '1') return 'gh-cli';
  if (env.MEGINGJORD_MCP_FORCE_AVAILABLE === '1') return 'mcp';
  return env.MEGINGJORD_MCP_AVAILABLE === '1' ? 'mcp' : 'gh-cli';
}

function toolName(operation, prov) {
  const MAP = {
    'create-issue': { mcp: 'mcp__github__create_issue', cli: 'gh issue create' },
    'add-comment': { mcp: 'mcp__github__create_issue_comment', cli: 'gh issue comment' },
    'get-issue': { mcp: 'mcp__github__get_issue', cli: 'gh issue view' },
    'list-issues': { mcp: 'mcp__github__list_issues', cli: 'gh issue list' },
    'update-issue': { mcp: 'mcp__github__update_issue', cli: 'gh issue edit' },
    'update-project-v2-item-field': {
      mcp: 'mcp__github__update_project_v2_item_field_value',
      cli: 'gh api graphql -f query=...',
    },
  };
  if (!MAP[operation]) return null;
  return prov === 'mcp' ? MAP[operation].mcp : MAP[operation].cli;
}

function cliArgs(operation) {
  const ARGS = {
    'create-issue': ['issue', 'create'],
    'add-comment': ['issue', 'comment'],
    'get-issue': ['issue', 'view'],
    'list-issues': ['issue', 'list'],
    'update-issue': ['issue', 'edit'],
  };
  return ARGS[operation] || null;
}

function buildCliArgs(operation, params = {}) {
  const base = cliArgs(operation);
  if (!base) return null;
  const args = [...base];
  if (params.issue !== undefined) args.push(String(params.issue));
  if (params.title) args.push('--title', params.title);
  if (params.body) args.push('--body', params.body);
  if (params.label) args.push('--add-label', params.label);
  if (params.json) args.push('--json', params.json);
  return args;
}

async function executeViaCli(operation, params = {}, runner = execFileAsync) {
  const args = buildCliArgs(operation, params);
  if (!args) return { ok: false, reason: `unknown-cli-operation:${operation}` };
  try {
    const { stdout, stderr } = await runner('gh', args);
    return { ok: true, provider: 'gh-cli', stdout, stderr };
  } catch (error) {
    return { ok: false, provider: 'gh-cli', error: error.message };
  }
}

async function executeViaMcp(operation, params = {}, mcpClient) {
  if (!mcpClient || typeof mcpClient.invoke !== 'function') {
    return { ok: false, reason: 'mcp-client-required', operation };
  }
  const tool = toolName(operation, 'mcp');
  if (!tool) return { ok: false, reason: `unknown-mcp-operation:${operation}` };
  try {
    const result = await mcpClient.invoke(tool, params);
    return { ok: true, provider: 'mcp', tool, result };
  } catch (error) {
    return { ok: false, provider: 'mcp', tool, error: error.message };
  }
}

async function execute(operation, params = {}, opts = {}) {
  const { env = process.env, mcpClient = null, cliRunner = execFileAsync } = opts;
  const prov = provider(env);
  if (prov === 'mcp') {
    const mcpResult = await executeViaMcp(operation, params, mcpClient);
    if (mcpResult.ok) return mcpResult;
    return executeViaCli(operation, params, cliRunner);
  }
  return executeViaCli(operation, params, cliRunner);
}

function dispatch(operation, env = process.env) {
  const prov = provider(env);
  const tool = toolName(operation, prov);
  return { provider: prov, tool, ok: tool !== null };
}

module.exports = {
  provider, toolName, dispatch, cliArgs, buildCliArgs,
  executeViaCli, executeViaMcp, execute,
};
