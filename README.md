# Khatm Infrastructure as Code

## Setup Environment
1. Add the following environment variables:
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
    - CLOUDFLARE_EMAIL. This is the user's account, not the owner account
    - CLOUDFLARE_API_KEY. This is the user's only api key, not a created API Token
    - CLOUDFLARE_ZONE_ID. Get this from the Cloudflare dashboard
    - DOMAIN_CERTIFICATE_ARN. This is the ARN of the AWS ACM cert created for the domain you own
    - SECRETS_MANAGER_ARN. Where the application environments exist in ASM. Eg. `arn:aws:secretsmanager:<zone>:<userid>:secret:*`. You can replace the `*` to restrict access
    - SECRETS_KMS_ARN. Eg. `arn:aws:kms:<zone>:<userid>:key/*`
    - ACM_DOMAIN. As displayed in the domain section of the ACM certificate, eg. `*.domain.com`
    - ECR_REPOSITORY_URI. The URI for your long living ECR repository.
    - GITHUB_REPO_URL. The `.git` url to your repository
    - GITHUB_ACCESS_TOKEN. Generate a Personal Access Token. Minimum scope needed is `repo`
    - GITHUB_BRANCH. The branch to observe for code changes
1. Install [Docker Engine](https://docs.docker.com/get-docker/)
    - Docker Desktop is fine when running on local machine

## Debug

Common failures seen:
- `pulumi up` fails on the CloudFormation stack is in `ROLLBACK_COMPLETE` or `DELETE_COMPLETE` state `and can not be updated`.
  - Solution: Go into AWS Console and delete the offensive CloudFormation instance.
  - Run `pulumi refresh` and let Pulumi recognize state and update the Pulumi stack.
  - Rerun `pulumi up`