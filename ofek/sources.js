"use strict";

/**
 * Paid / licensed data sources for Ofek research (S&P Global, Morningstar,
 * Daloopa, FactSet, an internal document store, …) via the Claude API MCP
 * connector. Configure in OFEK_MCP_SERVERS as a JSON array:
 *
 *   [{ "name": "morningstar", "label": "Morningstar", "url": "https://…",
 *      "authorization_token": "…", "allowedTools": ["search"] }]
 *
 * Only servers listed here are attached, only over https, and tokens are
 * never returned by the API. A subscription with the provider is required;
 * the connector only transports the requests.
 */

function loadSources(raw = process.env.OFEK_MCP_SERVERS) {
  if (!raw || !raw.trim()) return { sources: [], errors: [] };
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return { sources: [], errors: ["OFEK_MCP_SERVERS אינו JSON תקין"] };
  }
  if (!Array.isArray(list)) return { sources: [], errors: ["OFEK_MCP_SERVERS חייב להיות מערך"] };
  const errors = [];
  const seen = new Set();
  const sources = [];
  list.forEach((s, i) => {
    if (!s || !/^[a-z0-9_-]{1,64}$/i.test(s.name || "")) return errors.push(`[${i}] name: אותיות לטיניות, ספרות, _ או -`);
    if (seen.has(s.name)) return errors.push(`[${i}] name כפול: ${s.name}`);
    let u;
    try { u = new URL(s.url); } catch { return errors.push(`[${i}] url לא תקין`); }
    if (u.protocol !== "https:") return errors.push(`[${i}] url חייב להיות https`);
    seen.add(s.name);
    sources.push({
      name: s.name,
      label: s.label || s.name,
      url: s.url,
      authorization_token: s.authorization_token || null,
      allowedTools: Array.isArray(s.allowedTools) && s.allowedTools.length ? s.allowedTools : null,
    });
  });
  return { sources, errors };
}

/** Request fragments for the MCP connector (beta mcp-client-2025-11-20). */
function mcpRequestParts(sources) {
  if (!sources.length) return null;
  return {
    beta: "mcp-client-2025-11-20",
    mcp_servers: sources.map((s) => ({
      type: "url", url: s.url, name: s.name,
      ...(s.authorization_token ? { authorization_token: s.authorization_token } : {}),
    })),
    tools: sources.map((s) =>
      s.allowedTools
        ? {
            type: "mcp_toolset", mcp_server_name: s.name,
            default_config: { enabled: false },
            configs: Object.fromEntries(s.allowedTools.map((t) => [t, { enabled: true }])),
          }
        : { type: "mcp_toolset", mcp_server_name: s.name }),
  };
}

/** Safe description for status endpoints — never includes tokens. */
function describeSources(sources) {
  return sources.map((s) => ({ name: s.name, label: s.label, host: new URL(s.url).host, authenticated: !!s.authorization_token, allowedTools: s.allowedTools }));
}

module.exports = { loadSources, mcpRequestParts, describeSources };
