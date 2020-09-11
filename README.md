# Khatm Infrastructure as Code

- [The Khatm Organization](https://khatm.org/)
- [The Infrastructure Architecture](https://github.com/khatm-org/khatm-infrastructure/wiki/Architecture)

## Setup Environment
1. Add the following environment variables to your `~/.bash_profile` or `~/.zshrc`. For some reason it doesn't work in the `.env`
    - CLOUDFLARE_EMAIL. This is the user's account, not the owner account
    - CLOUDFLARE_API_KEY. This is the user's only api key, not a created API Token
1. Run `cp .env-keep .env` and fill in each key following the provided hints
    - In AWS Secrets Manager, setup the following key/values:
        - {APP_NAME}/{Pulumi Stack}/google_sso_client_id. For example: `khatm/staging/google_sso_client_id`
        - {APP_NAME}/{Pulumi Stack}/api_key
        - {APP_NAME}/{Pulumi Stack}/db/name.
        - {APP_NAME}/{Pulumi Stack}/db/user.
        - {APP_NAME}/{Pulumi Stack}/db/password.
    - Instructions:
        1. Navigate to AWS Secrets Manager
        1. Choose `Other types of secrets`
        1. Choose `Plaintext`. Insert the value here only as plain text, don't use JSON.
        1. Next screen, here you enter the key for the `Secret Name`. Eg. `khatm/staging/google_sso_client_id`.
1. Install [Docker Engine](https://docs.docker.com/get-docker/)
    - Docker Desktop is fine when running on local machine

## Run Commands

Currently it's quite a task to seperate foundational services from application services (because we don't want to bring down our database and lose production data when we want to restart the servers) through Pulumi ([Issue 27](https://github.com/khatm-org/khatm-infrastructure/issues/27)), we're using node scripts and environment variables to control what part of the code runs.

The following are to start and stop the foundation services (VPC, RDS, etc)
- `npm run start:foundation`
- `npm run stop:foundation`

The following are to start and stop the application services (ECS, ALB, DNS entries, etc)
- `npm run start:application`
- `npm run stop:application`

Note: Stopping foundation will also stop application services.

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
