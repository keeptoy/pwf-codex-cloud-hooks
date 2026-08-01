#!/usr/bin/env bash

set -Eeuo pipefail

#######################################
# Configuration
#######################################

: "${HOME:?HOME must be set}"

# Every setting can be overridden through the environment before execution.
# Defaults target the Codex Cloud Debian/Ubuntu sandbox.
export CODEX_HOME="${CODEX_HOME:-/opt/codex}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

readonly MANAGED_REQUIREMENTS="${MANAGED_REQUIREMENTS:-/etc/codex/requirements.toml}"

readonly NVM_VERSION="${NVM_VERSION:-v0.40.1}"
readonly NODE_VERSION="${NODE_VERSION:-24}"

readonly SKILLS_CLI_VERSION="${SKILLS_CLI_VERSION:-1.5.21}"
readonly PLANNING_WITH_FILES_VERSION="${PLANNING_WITH_FILES_VERSION:-v3.8.2}"
readonly PLANNING_WITH_FILES_ROOT="${PLANNING_WITH_FILES_ROOT:-$HOME/.agents/skills/planning-with-files}"

readonly POWERSHELL_VERSION="${POWERSHELL_VERSION:-7.5.9}"
readonly POWERSHELL_PACKAGE="${POWERSHELL_PACKAGE:-powershell_${POWERSHELL_VERSION}-1.deb_amd64.deb}"
readonly POWERSHELL_URL="${POWERSHELL_URL:-https://github.com/PowerShell/PowerShell/releases/download/v${POWERSHELL_VERSION}/${POWERSHELL_PACKAGE}}"
readonly POWERSHELL_SHA256="${POWERSHELL_SHA256:-1d551a739ac5db6957ca9d71bd2e332a7b688e85ea5fb43c73fd42395042ef94}"

readonly HOOKS_VERSION="${HOOKS_VERSION:-v0.2.2}"
readonly HOOKS_PACKAGE="${HOOKS_PACKAGE:-pwf-codex-cloud-hooks-${HOOKS_VERSION}.zip}"
readonly HOOKS_ARCHIVE_ROOT="${HOOKS_ARCHIVE_ROOT:-pwf-codex-cloud-hooks}"
readonly HOOKS_URL="${HOOKS_URL:-https://github.com/keeptoy/pwf-codex-cloud-hooks/releases/download/${HOOKS_VERSION}/${HOOKS_PACKAGE}}"
readonly HOOKS_SHA256="${HOOKS_SHA256:-ab6cafbae979083eadeabd5146ab9dfc29fdf0702bf366254589f8f8ef05145d}"
readonly PLANNING_SKILL_PATCH_ID="PWF_CODEX_CLOUD_COMPAT_PATCH_V1"
readonly PLANNING_SKILL_PATCHED_SHA256="f0e7aa7dc981e1a094f695991e38d7a475e59ffbe635cd5335428c5456ac256e"

# The only mutable shared state is the disposable workspace lifecycle.
WORK_DIR=""

#######################################
# Common utilities
#######################################

log() {
  printf '\n==> %s\n' "$*"
}

die() {
  printf '\nError: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 ||
    die "Required command not found: $1"
}

download_file() {
  local url="$1"
  local destination="$2"

  require_command curl

  curl \
    --fail \
    --silent \
    --show-error \
    --location \
    --retry 3 \
    --retry-delay 2 \
    --output "$destination" \
    "$url"
}

verify_sha256() {
  local expected_sha256="$1"
  local file="$2"

  require_command sha256sum

  printf '%s  %s\n' "$expected_sha256" "$file" |
    sha256sum --check --status - ||
    die "SHA-256 verification failed: $file"
}

ensure_work_dir() {
  [ -n "$WORK_DIR" ] && return

  require_command mktemp
  WORK_DIR="$(mktemp -d)"
  trap cleanup_work_dir EXIT
}

cleanup_work_dir() {
  [ -n "$WORK_DIR" ] || return 0
  [ -d "$WORK_DIR" ] || return 0

  rm -rf -- "$WORK_DIR"
}

#######################################
# Environment contracts
#######################################

require_root() {
  [ "$(id -u)" -eq 0 ] ||
    die "This component must run as root."
}

require_debian() {
  [ -f /etc/debian_version ] ||
    die "This component currently supports Debian/Ubuntu only."
}

require_amd64() {
  local architecture

  require_command dpkg
  architecture="$(dpkg --print-architecture)"

  [ "$architecture" = "amd64" ] ||
    die "The PowerShell package requires amd64; detected: $architecture"
}

require_codex_runtime() {
  [ -d "$CODEX_HOME" ] ||
    die "Codex Cloud home does not exist: $CODEX_HOME"

  [ -x "$CODEX_HOME/bin/codex" ] ||
    die "Codex executable was not found: $CODEX_HOME/bin/codex"
}

print_environment() {
  local architecture="unknown"

  if command -v dpkg >/dev/null 2>&1; then
    architecture="$(dpkg --print-architecture)"
  fi

  log "Detected Codex Cloud Runtime"

  printf '%s\n' \
    "HOME=$HOME" \
    "CODEX_HOME=$CODEX_HOME" \
    "Codex=$("$CODEX_HOME/bin/codex" --version)" \
    "Architecture=$architecture"
}

#######################################
# Component: system prerequisites
#######################################

install_system_prerequisites() {
  require_command apt-get

  log "Updating APT package metadata"
  env DEBIAN_FRONTEND=noninteractive apt-get update

  log "Installing system prerequisites"
  env DEBIAN_FRONTEND=noninteractive \
    apt-get install -y \
      ca-certificates \
      curl \
      unzip

  require_command curl
  require_command unzip
}

#######################################
# Component: PowerShell
#######################################

install_powershell() {
  local package_file="$1"

  require_command apt-get

  log "Downloading PowerShell ${POWERSHELL_VERSION}"
  download_file "$POWERSHELL_URL" "$package_file"

  log "Verifying PowerShell package"
  verify_sha256 "$POWERSHELL_SHA256" "$package_file"

  log "Installing PowerShell ${POWERSHELL_VERSION}"
  env DEBIAN_FRONTEND=noninteractive apt-get install -y "$package_file"

  require_command pwsh
  log "PowerShell installed"
  pwsh --version
}

#######################################
# Component: NVM and Node.js
#######################################

load_node_environment() {
  [ -s "$NVM_DIR/nvm.sh" ] ||
    die "NVM initialization script was not found: $NVM_DIR/nvm.sh"

  # Load NVM directly. Do not source ~/.bashrc.
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
}

activate_available_node_environment() {
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    load_node_environment
  fi

  verify_node_toolchain
}

verify_node_toolchain() {
  require_command node
  require_command npm
  require_command npx
}

install_nodejs() {
  require_command curl

  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    log "Installing NVM ${NVM_VERSION}"

    curl \
      --fail \
      --silent \
      --show-error \
      --location \
      --retry 3 \
      "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" |
      bash
  else
    log "Existing NVM installation found at $NVM_DIR"
  fi

  load_node_environment

  log "Installing Node.js ${NODE_VERSION}"
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
  nvm alias default "$NODE_VERSION"

  verify_node_toolchain

  log "Node.js installed"
  printf '%s\n' \
    "Node.js=$(node --version)" \
    "npm=$(npm --version)"
}

#######################################
# Component: planning-with-files Skill
#######################################

verify_planning_skill() {
  [ -f "$PLANNING_WITH_FILES_ROOT/SKILL.md" ] ||
    die "planning-with-files was not found at: $PLANNING_WITH_FILES_ROOT/SKILL.md"

  [ -f "$PLANNING_WITH_FILES_ROOT/scripts/resolve-plan-dir.sh" ] ||
    die "resolve-plan-dir.sh was not found in the installed Skill."

  [ -f "$PLANNING_WITH_FILES_ROOT/scripts/session-catchup.py" ] ||
    die "session-catchup.py was not found in the installed Skill."
}

verify_patched_planning_skill() {
  verify_planning_skill
  verify_sha256 \
    "$PLANNING_SKILL_PATCHED_SHA256" \
    "$PLANNING_WITH_FILES_ROOT/scripts/session-catchup.py"
}

install_planning_skill() {
  verify_node_toolchain

  log "Installing planning-with-files ${PLANNING_WITH_FILES_VERSION}"

  npx --yes "skills@${SKILLS_CLI_VERSION}" add \
    "https://github.com/OthmanAdi/planning-with-files/tree/${PLANNING_WITH_FILES_VERSION}" \
    --skill planning-with-files \
    --agent codex \
    --global \
    --yes

  verify_planning_skill

  log "planning-with-files installed"
  printf 'Skill root: %s\n' "$PLANNING_WITH_FILES_ROOT"
}

#######################################
# Component: Managed Hooks installer
#######################################

assert_hooks_checksum_configured() {
  [ "$HOOKS_SHA256" != "0000000000000000000000000000000000000000000000000000000000000000" ] ||
    die "HOOKS_SHA256 is still a placeholder. Publish ${HOOKS_VERSION} and set its real SHA-256."
}

download_hooks_archive() {
  local archive_file="$1"

  assert_hooks_checksum_configured

  log "Downloading pwf-codex-cloud-hooks ${HOOKS_VERSION}"
  download_file "$HOOKS_URL" "$archive_file"

  log "Verifying pwf-codex-cloud-hooks archive"
  verify_sha256 "$HOOKS_SHA256" "$archive_file"
}

extract_hooks_installer() {
  local archive_file="$1"
  local extract_dir="$2"
  local installer_dir="$3"

  require_command unzip
  mkdir -p "$extract_dir"

  log "Extracting pwf-codex-cloud-hooks"
  unzip -q "$archive_file" -d "$extract_dir"

  [ -f "$installer_dir/install.js" ] ||
    die "Hook installer entry point was not found: $installer_dir/install.js"
}

apply_planning_skill_compat_patch() {
  local installer_dir="$1"
  local patcher="$installer_dir/patches/patch_planning_skill.py"
  local manifest="$installer_dir/upstream-manifest.json"

  require_command python3

  [ -f "$patcher" ] ||
    die "planning-with-files compatibility patcher was not found: $patcher"

  [ -f "$manifest" ] ||
    die "Upstream manifest was not found: $manifest"

  # PWF_CODEX_CLOUD_COMPAT_PATCH_V1 is a temporary, hash-pinned compatibility
  # patch for upstream v3.8.2. Codex Cloud installs the Skill under ~/.agents
  # and stores sessions under $CODEX_HOME/sessions. Remove this step after an
  # equivalent upstream release is pinned and verified.
  log "Applying planning-with-files Codex Cloud compatibility patch"
  python3 "$patcher" apply \
    --skill-root "$PLANNING_WITH_FILES_ROOT" \
    --manifest "$manifest"

  verify_patched_planning_skill
}

run_hooks_installer() {
  local installer_dir="$1"
  shift

  require_command node

  node "$installer_dir/install.js" \
    "$@" \
    --json \
    --codex-home "$CODEX_HOME" \
    --skill-root "$PLANNING_WITH_FILES_ROOT" \
    --managed-requirements "$MANAGED_REQUIREMENTS"
}

install_managed_hooks() {
  local installer_dir="$1"

  log "Previewing Managed Hook installation"
  run_hooks_installer "$installer_dir" install --dry-run

  log "Installing Managed Hooks"
  run_hooks_installer "$installer_dir" install
}

doctor_managed_hooks() {
  local installer_dir="$1"

  log "Running Managed Hook doctor"
  run_hooks_installer "$installer_dir" doctor
}

install_hooks_component() {
  local archive_file="$WORK_DIR/$HOOKS_PACKAGE"
  local extract_dir="$WORK_DIR/hooks-extract"
  local installer_dir="$extract_dir/$HOOKS_ARCHIVE_ROOT"

  download_hooks_archive "$archive_file"
  extract_hooks_installer "$archive_file" "$extract_dir" "$installer_dir"
  apply_planning_skill_compat_patch "$installer_dir"
  install_managed_hooks "$installer_dir"
  doctor_managed_hooks "$installer_dir"
}

#######################################
# Component: Managed Hooks verification
#######################################

verify_hooks_filesystem() {
  local hook_adapter="$1"
  local hook_manifest="$2"

  require_command grep

  [ -f "$MANAGED_REQUIREMENTS" ] ||
    die "Managed requirements file was not created: $MANAGED_REQUIREMENTS"

  [ -x "$hook_adapter" ] ||
    die "Hook adapter was not installed or is not executable: $hook_adapter"

  [ -f "$hook_manifest" ] ||
    die "Hook manifest was not created: $hook_manifest"

  grep -Eq '^[[:space:]]*hooks[[:space:]]*=[[:space:]]*true' \
    "$MANAGED_REQUIREMENTS" ||
    die "features.hooks=true was not found in $MANAGED_REQUIREMENTS"

  grep -Fq '[[hooks.SessionStart]]' "$MANAGED_REQUIREMENTS" ||
    die "Managed SessionStart Hook was not found."

  grep -Fq '[[hooks.UserPromptSubmit]]' "$MANAGED_REQUIREMENTS" ||
    die "Managed UserPromptSubmit Hook was not found."

  grep -Fq "$hook_adapter" "$MANAGED_REQUIREMENTS" ||
    die "Managed requirements do not reference the installed adapter."
}

validate_managed_requirements_toml() {
  require_command python3

  log "Validating Managed requirements TOML"

  python3 - "$MANAGED_REQUIREMENTS" <<'PY'
import sys
import tomllib

requirements_file = sys.argv[1]

with open(requirements_file, "rb") as file:
    config = tomllib.load(file)

if config.get("features", {}).get("hooks") is not True:
    raise SystemExit("features.hooks is not true")

hooks = config.get("hooks", {})

if not hooks.get("managed_dir"):
    raise SystemExit("hooks.managed_dir is missing")

if len(hooks.get("SessionStart", [])) != 1:
    raise SystemExit("Expected exactly one managed SessionStart Hook")

if len(hooks.get("UserPromptSubmit", [])) != 1:
    raise SystemExit("Expected exactly one managed UserPromptSubmit Hook")

print("Managed requirements TOML is valid")
PY
}

verify_codex_hooks_feature() {
  require_command grep

  log "Checking Codex Hook feature"

  "$CODEX_HOME/bin/codex" features list |
    grep -E '^hooks[[:space:]]+stable[[:space:]]+true$' ||
    die "Codex does not report Hooks as stable and enabled."
}

test_hook_protocol() {
  local hook_adapter="$1"
  local session_start_output
  local user_prompt_output

  require_command python3

  log "Testing SessionStart Hook adapter"

  session_start_output="$(
    printf '%s' \
      '{"hook_event_name":"SessionStart","source":"startup","cwd":"'"$(pwd)"'"}' |
      python3 "$hook_adapter" SessionStart
  )"

  printf '%s\n' "$session_start_output"
  printf '%s\n' "$session_start_output" |
    grep -Fq 'PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=startup' ||
    die "SessionStart adapter did not return its canary."

  log "Testing UserPromptSubmit Hook adapter"

  user_prompt_output="$(
    printf '%s' \
      '{"hook_event_name":"UserPromptSubmit","cwd":"'"$(pwd)"'","prompt":"setup verification"}' |
      python3 "$hook_adapter" UserPromptSubmit
  )"

  printf '%s\n' "$user_prompt_output"
  printf '%s\n' "$user_prompt_output" |
    grep -Fq 'PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit' ||
    die "UserPromptSubmit adapter did not return its canary."
}

verify_managed_hooks() {
  local hook_runtime="$CODEX_HOME/hooks/planning-with-files"
  local hook_adapter="$hook_runtime/hook_adapter.py"
  local hook_manifest="$hook_runtime/installed-manifest.json"

  verify_hooks_filesystem "$hook_adapter" "$hook_manifest"
  validate_managed_requirements_toml
  verify_codex_hooks_feature
  test_hook_protocol "$hook_adapter"
}

#######################################
# Reporting
#######################################

print_summary() {
  local hook_runtime="$CODEX_HOME/hooks/planning-with-files"

  log "Codex Cloud setup completed successfully"

  printf '%s\n' \
    "Codex home:          $CODEX_HOME" \
    "Codex version:       $("$CODEX_HOME/bin/codex" --version)" \
    "Skill root:          $PLANNING_WITH_FILES_ROOT" \
    "Skill patch:         $PLANNING_SKILL_PATCH_ID" \
    "Managed policy:      $MANAGED_REQUIREMENTS" \
    "Hook runtime:        $hook_runtime" \
    "Hook adapter:        $hook_runtime/hook_adapter.py" \
    "Installation record: $hook_runtime/installed-manifest.json"
}

print_black_box_instructions() {
  cat <<'EOF'

IMPORTANT:

The filesystem, Managed Hook policy, Codex feature, doctor, and adapter
protocol checks passed.

To complete the runtime black-box verification:

1. Finish this setup run.
2. Start a completely new Codex Cloud sandbox/task.
3. Do not reuse an already-running session.
4. Run the planning-with-files lifecycle Hook black-box prompt.
5. Confirm that the model observes:

   PWF_GLOBAL_HOOK_CANARY_V1 event=SessionStart source=startup
   PWF_GLOBAL_HOOK_CANARY_V1 event=UserPromptSubmit

这是一次 planning-with-files lifecycle Hook 黑盒验证。

严格限制：
1. 不要调用任何工具；
2. 不要运行 shell 命令；
3. 不要读取任何文件；
4. 不要根据 AGENTS.md、对话内容或已知字符串推测结果；
5. 不要自行构造或补全 canary；
6. 只报告在生成本次回复之前，runtime 已经注入到你上下文中的内容。

请逐字列出你实际看到的所有以
PWF_GLOBAL_HOOK_CANARY
开头的完整行。

然后严格按以下格式回答：

SessionStart: OBSERVED 或 NOT_OBSERVED
SessionStart source: 实际值；未观察到则写 NONE
UserPromptSubmit: OBSERVED 或 NOT_OBSERVED
Planning context: OBSERVED 或 NOT_OBSERVED

如果没有实际看到某一项，必须写 NOT_OBSERVED。
不要为了验证而使用任何工具或读取仓库文件。

EOF
}

#######################################
# Component orchestration
#######################################

run_prerequisites() {
  require_root
  require_debian
  install_system_prerequisites
}

run_powershell() {
  require_root
  require_debian
  require_amd64
  ensure_work_dir
  install_powershell "$WORK_DIR/$POWERSHELL_PACKAGE"
}

run_nodejs() {
  install_nodejs
}

run_skill() {
  activate_available_node_environment
  install_planning_skill
}

run_hooks() {
  require_root
  require_codex_runtime
  activate_available_node_environment
  verify_planning_skill
  ensure_work_dir
  install_hooks_component
  verify_managed_hooks
}

run_verification() {
  require_codex_runtime
  verify_patched_planning_skill
  verify_managed_hooks
}

run_all() {
  require_root
  require_debian
  require_amd64
  require_codex_runtime
  print_environment

  install_system_prerequisites
  ensure_work_dir
  install_powershell "$WORK_DIR/$POWERSHELL_PACKAGE"
  install_nodejs
  install_planning_skill
  install_hooks_component
  verify_managed_hooks

  print_summary
  print_black_box_instructions
}

usage() {
  cat <<'EOF'
Usage: setup.bash [command]

Commands:
  all            Run the complete Codex Cloud setup (default).
  prerequisites  Install shared APT packages: ca-certificates, curl, unzip.
  powershell     Install and verify PowerShell; requires the prerequisite packages.
  nodejs         Install NVM and Node.js; requires curl.
  skill          Install and verify planning-with-files only; requires Node.js.
  hooks          Apply the Skill compatibility patch, then install, doctor, and verify
                 Managed Hooks; requires Node.js and the upstream Skill.
  verify         Verify the patched Skill and Managed Hooks without installing anything.
  help           Show this help.

Component commands do not implicitly install other components. Run their stated
dependencies first, or use "all" for the complete ordered workflow.
EOF
}

main() {
  local command="${1:-all}"

  [ "$#" -le 1 ] || {
    usage >&2
    die "Expected at most one command."
  }

  case "$command" in
    all) run_all ;;
    prerequisites) run_prerequisites ;;
    powershell) run_powershell ;;
    nodejs) run_nodejs ;;
    skill) run_skill ;;
    hooks) run_hooks ;;
    verify) run_verification ;;
    help|-h|--help) usage ;;
    *)
      usage >&2
      die "Unknown command: $command"
      ;;
  esac
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
