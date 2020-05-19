# EPS / Remote signing steel thread application

# Backend config
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

## Applying changes
* First time setup:
    * Set up environment variables:
        * Create a .envrc file.
        * Add the line `export AWS_PROFILE_NAME_DEPLOY_ROLE="<name of your deploy role profile in ~/.aws/config>"`.
        * Allow direnv to use the .envrc file by running `direnv allow`.
    * Set up a python environment:
        * Run `pyenv virtualenv 3.8.2 eps-steel-thread`.
        * Run `pyenv local eps-steel-thread`.
        * Run `pip install -r requirements.txt`.
* Each time:
    * Run `$(python set_environment_variables.py)`.
    * Run `terraform init -backend-config=.backend.config`.
    * Run `terraform apply`.