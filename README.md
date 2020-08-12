# Khatm Infrastructure as Code

## Setup Environment
1. Add the following environment variables to your `~/.bash_profile` or `~/.zshrc`. For some reason it doesn't work in the `.env`
    - CLOUDFLARE_EMAIL. This is the user's account, not the owner account
    - CLOUDFLARE_API_KEY. This is the user's only api key, not a created API Token
1. Run `cp .env-keep .env` and fill in each key following the provided hints
    - In AWS Secrets Manager, setup the following key/values:
        - {APP_NAME}/{Pulumi Stack}/google_sso_client_id. For example: `khatm/production/google_sso_client_id`
        - {APP_NAME}/{Pulumi Stack}/api_key
        - {APP_NAME}/{Pulumi Stack}/db/name.
        - {APP_NAME}/{Pulumi Stack}/db/user.
        - {APP_NAME}/{Pulumi Stack}/db/password.
1. Install [Docker Engine](https://docs.docker.com/get-docker/)
    - Docker Desktop is fine when running on local machine

## Debug

Common failures seen:
- `pulumi up` fails on the CloudFormation stack is in `ROLLBACK_COMPLETE` or `DELETE_COMPLETE` state `and can not be updated`.
    - Solution: Go into AWS Console and delete the offensive CloudFormation instance.
    - Run `pulumi refresh` and let Pulumi recognize state and update the Pulumi stack.
    - Try again
- `pulumi destroy` fails to delete a service with dependencies.
    - Run `pulumi stack export | pulumi stack import`
    - Run `pulumi refresh`
    - Try again