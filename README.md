# EPS / Remote signing steel thread application

# Running terraform
The credentials for the terraform state bucket need to be added to `.backend.config` file. The file should contain the following values:
```
bucket = "<bucket-name>"
key = "<state-key-name>"
region = "<region>"
```
This can be initialised using `terraform init -backend-config=.backend.config`

# Creating the lambda function artifact
Terraform expects to find a zip archive named `handler.zip` containing the function code. This can be created by zipping the `handler.py` file:
```bash
zip handler.zip handler.py
```