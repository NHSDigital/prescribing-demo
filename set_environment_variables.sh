# Because we need to source this script, adding "set -euo pipefail" causes the terminal to quit immediately on error.
# Instead use "|| return" after operations which may fail.
function export_credentials {
  access_key_id=$(echo "$1" | jq -r '.Credentials.AccessKeyId') || return
  secret_access_key=$(echo "$1" | jq -r '.Credentials.SecretAccessKey') || return
  session_token=$(echo "$1" | jq -r '.Credentials.SessionToken') || return
  expiration=$(echo "$1" | jq -r '.Credentials.Expiration') || return
  export AWS_ACCESS_KEY_ID=$access_key_id
  export AWS_SECRET_ACCESS_KEY=$secret_access_key
  export AWS_SESSION_TOKEN=$session_token
  expiration_seconds=$(date -d "$expiration" +%s)
  now_seconds=$(date +%s)
  diff_seconds=$((expiration_seconds - now_seconds))
  echo "Credentials exported, valid for $(date -u -d @$diff_seconds +%H:%M:%S)"
}
mfa_arn=$(aws configure get mfa_serial --profile "$AWS_PROFILE_NAME_USER") || return
echo "Enter MFA code:"
read -r mfa_code
token_json=$(aws sts get-session-token --serial-number "$mfa_arn" --token-code "$mfa_code" --profile "$AWS_PROFILE_NAME_USER") || return
export_credentials "$token_json"
deploy_role_arn=$(aws configure get role_arn --profile "$AWS_PROFILE_NAME_DEPLOY_ROLE") || return
token_json=$(aws sts assume-role --role-arn "$deploy_role_arn" --role-session-name deploy-session) || return
export_credentials "$token_json"
