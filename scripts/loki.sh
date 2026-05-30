# shellcheck shell=bash
#
# Shared structured-logging helper for personal-site build scripts. Sourced, not
# executed. Emits one JSON line per event to stderr AND fire-and-forgets it to
# the homelab Loki push API. Per the global structured-logging rule:
#   - labels: job=personal-site, script=<name>, host=<hostname>
#   - never blocks or fails the build: missing jq/curl or an unreachable Loki
#     (e.g. inside the dev container) is silently ignored.
#
# Usage:
#   source "$(dirname "$0")/loki.sh"
#   loki_emit copy-pdfs info started
#   loki_emit copy-pdfs info complete elapsed_s=3 count=42
#   loki_emit copy-pdfs error failed reason=missing_dir
#
# Extra args are flat key=value pairs added to the JSON line as string fields.

LOKI_URL="${LOKI_URL:-http://127.0.0.1:3100/loki/api/v1/push}"
LOKI_JOB="personal-site"

loki_emit() {
  local script="${1:-unknown}" level="${2:-info}" msg="${3:-}"
  shift 3 2>/dev/null || true

  command -v jq >/dev/null 2>&1 || return 0
  command -v curl >/dev/null 2>&1 || return 0

  local now ts host
  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  ts="$(date +%s)000000000"
  host="$(hostname -s 2>/dev/null || echo unknown)"

  # Build the JSON log line with jq so values are escaped safely.
  local jq_args=(--arg level "$level" --arg msg "$msg" --arg time "$now")
  local filter='{level:$level,msg:$msg,time:$time'
  local kv key
  for kv in "$@"; do
    key="${kv%%=*}"
    jq_args+=(--arg "v_$key" "${kv#*=}")
    filter+=",\"$key\":\$v_$key"
  done
  filter+='}'

  local line
  line="$(jq -nc "${jq_args[@]}" "$filter")" || return 0
  printf '%s\n' "$line" >&2

  local payload
  payload="$(jq -nc \
    --arg ts "$ts" --arg line "$line" --arg job "$LOKI_JOB" \
    --arg script "$script" --arg host "$host" --arg level "$level" \
    '{streams:[{stream:{job:$job,script:$script,host:$host,level:$level},values:[[$ts,$line]]}]}')" || return 0

  curl -s --max-time 3 -X POST "$LOKI_URL" \
    -H 'Content-Type: application/json' --data "$payload" >/dev/null 2>&1 || true
  return 0
}
