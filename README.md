# Khatm Infrastructure as Code

## Setup Environment
1. Add the following environment variables:
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
    - CLOUDFLARE_EMAIL. This is the user's account, not the owner account
    - CLOUDFLARE_API_KEY. This is the user's only api key, not a created API Token
    - CLOUDFLARE_ZONE_ID. Get this from the Cloudflare dashboard
    - DOMAIN_CERTIFICATE_ARN. This is the ARN of the AWS ACM cert created for the domain you own
    - SECRETS_MANAGER_ARN. Where the application environments exist in ASM
1. Install [Docker Engine](https://docs.docker.com/get-docker/)
    - Docker Desktop is fine when running on local machine