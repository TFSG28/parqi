#!/usr/bin/env bash
#
# Reusable cPanel (UAPI/JSON-API) deploy helper with retry + exponential backoff.
# The cPanel API is flaky under load, so every network operation is retried.
#
# Required environment variables:
#   CPANEL_HOST        cPanel host (without scheme/port), e.g. server.example.com
#   CPANEL_USER        cPanel username
#   CPANEL_API_TOKEN   cPanel API token
#   DEPLOY_PATH        Absolute deploy directory on the server
#   ZIP_FILE           Path to the local zip to upload (for the "upload" op)
#
# Optional:
#   MAX_ATTEMPTS       Total attempts per operation (default 5)
#   BASE_SLEEP         Initial backoff in seconds, doubled each retry (default 10)
#
# Usage: cpanel-deploy.sh <upload|extract|restart|cleanup>
set -euo pipefail

MAX_ATTEMPTS="${MAX_ATTEMPTS:-5}"
BASE_SLEEP="${BASE_SLEEP:-10}"
API="https://${CPANEL_HOST}:2083"
AUTH="Authorization: cpanel ${CPANEL_USER}:${CPANEL_API_TOKEN}"

# run_with_retry <description> <jq-success-filter> <command...>
run_with_retry() {
    local desc="$1"; local check="$2"; shift 2
    local attempt=1
    local sleep_s="$BASE_SLEEP"

    while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
        echo "[$desc] attempt ${attempt}/${MAX_ATTEMPTS}..."
        local response
        response="$("$@")" || response=""
        echo "$response" | jq '.' 2>/dev/null || echo "$response"

        if [ -n "$response" ] && echo "$response" | jq -e "$check" >/dev/null 2>&1; then
            echo "[$desc] OK on attempt ${attempt}"
            return 0
        fi

        if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
            echo "[$desc] FAILED after ${MAX_ATTEMPTS} attempts"
            return 1
        fi

        echo "[$desc] retrying in ${sleep_s}s..."
        sleep "$sleep_s"
        attempt=$((attempt + 1))
        sleep_s=$((sleep_s * 2))
    done
}

do_upload() {
    curl -s -X POST "${API}/execute/Fileman/upload_files" \
        -H "$AUTH" \
        -F "dir=${DEPLOY_PATH}" \
        -F "overwrite=1" \
        -F "file-1=@${ZIP_FILE}"
}

do_extract() {
    curl -s -X POST "${API}/json-api/cpanel" \
        -H "$AUTH" \
        --data-urlencode "cpanel_jsonapi_version=2" \
        --data-urlencode "cpanel_jsonapi_module=Fileman" \
        --data-urlencode "cpanel_jsonapi_func=fileop" \
        --data-urlencode "op=extract" \
        --data-urlencode "sourcefiles=${DEPLOY_PATH}/deploy.zip" \
        --data-urlencode "destfiles=${DEPLOY_PATH}" \
        --data-urlencode "doubledecode=1" \
        --data-urlencode "overwrite=1"
}

do_restart() {
    curl -s -X POST "${API}/json-api/cpanel" \
        -H "$AUTH" \
        --data-urlencode "cpanel_jsonapi_version=2" \
        --data-urlencode "cpanel_jsonapi_module=Fileman" \
        --data-urlencode "cpanel_jsonapi_func=savefile" \
        --data-urlencode "dir=${DEPLOY_PATH}/tmp" \
        --data-urlencode "filename=restart.txt" \
        --data-urlencode "content=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}

case "${1:-}" in
    upload)  run_with_retry "upload"  '.data.uploads[0].status == 1'   do_upload ;;
    extract) run_with_retry "extract" '.cpanelresult.event.result == 1' do_extract ;;
    restart) run_with_retry "restart" '.cpanelresult.event.result == 1' do_restart ;;
    cleanup)
        # Best-effort cleanup; never fail the deploy on this.
        curl -s -X POST "${API}/execute/Fileman/delete_files" \
            -H "$AUTH" \
            --data-urlencode "files=${DEPLOY_PATH}/deploy.zip" | jq '.' || true
        ;;
    *)
        echo "Usage: $0 <upload|extract|restart|cleanup>" >&2
        exit 1
        ;;
esac
