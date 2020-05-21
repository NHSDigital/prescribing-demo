import os
import boto3

deploy_role_profile_name = os.environ["AWS_PROFILE_NAME_DEPLOY_ROLE"]
deploy_role_session = boto3.Session(profile_name=deploy_role_profile_name)
deploy_role_credentials = deploy_role_session.get_credentials().get_frozen_credentials()
print(f"export AWS_ACCESS_KEY_ID={deploy_role_credentials.access_key}")
print(f"export AWS_SECRET_ACCESS_KEY={deploy_role_credentials.secret_key}")
print(f"export AWS_SESSION_TOKEN={deploy_role_credentials.token}")
