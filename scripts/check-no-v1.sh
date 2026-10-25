#!/usr/bin/env bash
# Garde-fou ADR-0016 : échoue si une référence à CPC V1 apparaît dans le code ou la configuration.
# docs/ et CLAUDE.md sont exclus : ils citent volontairement V1 comme périmètre interdit.
set -euo pipefail
cd "$(dirname "$0")/.."

PATTERNS=(
  "cfgvtyxiggewauevvigm"          # ref Supabase CPC V1
)

status=0
for p in "${PATTERNS[@]}"; do
  if matches=$(grep -RIn --exclude-dir={.git,node_modules,.next,docs,playwright-report,test-results} \
      --exclude=CLAUDE.md --exclude=check-no-v1.sh -- "$p" . ); then
    echo "❌ Référence CPC V1 détectée ($p) :"
    echo "$matches"
    status=1
  fi
done

# Variables d'environnement présentes dans le job (CI / Vercel) : aucune ne doit pointer vers V1.
if env | grep -q "cfgvtyxiggewauevvigm"; then
  echo "❌ Une variable d'environnement pointe vers CPC V1."
  status=1
fi

[ "$status" -eq 0 ] && echo "✅ check-no-v1 : aucune référence CPC V1."
exit "$status"
