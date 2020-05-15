# EPS / Remote signing steel thread application

# Creating the lambda function artifact
Terraform expects to find a zip archive named `handler.zip` containing the function code. This can be created by zipping the `handler.py` file:
```bash
zip handler.zip handler.py
```