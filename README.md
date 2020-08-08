# Khatm Infrastructure as Code

## Setup Environment
1. Run `cp .env-keep .env` and fill in each key
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