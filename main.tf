provider aws {
  region = "eu-west-2"
}

terraform {
  backend "s3" {}
}

data "aws_iam_policy_document" "assume-role-policy-document" {
  statement {
    sid = "1"

    effect = "Allow"

    actions = [
      "sts:AssumeRole"
    ]

    principals {
      type = "Service"
      identifiers = [
        "lambda.amazonaws.com"
      ]
    }
  }
}

resource "aws_iam_role" "lambda-execution-role" {
  name               = "${var.project-name}-lambda-exec-role"
  assume_role_policy = data.aws_iam_policy_document.assume-role-policy-document.json
}

resource "aws_iam_role_policy_attachment" "policy-attachment" {
  role       = aws_iam_role.lambda-execution-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "test_lambda" {
  filename      = "handler.zip"
  function_name = "${var.project-name}-test-lambda"
  role          = aws_iam_role.lambda-execution-role.arn
  handler       = "handler.main_handler"

  source_code_hash = filebase64sha256("handler.zip")

  runtime = "python3.8"
}

resource "aws_api_gateway_rest_api" "api-gateway" {
  name        = "${var.project-name}-rest-api"
  description = "Simple REST API for EPS steel thread"
}

resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.api-gateway.id
  parent_id   = aws_api_gateway_rest_api.api-gateway.root_resource_id
  path_part   = "{proxy+}"
}

resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.api-gateway.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.api-gateway.id
  resource_id = aws_api_gateway_method.proxy.resource_id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.test_lambda.invoke_arn
}

resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.api-gateway.id
  resource_id   = aws_api_gateway_rest_api.api-gateway.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "lambda_root" {
  rest_api_id = aws_api_gateway_rest_api.api-gateway.id
  resource_id = aws_api_gateway_method.proxy_root.resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.test_lambda.invoke_arn
}

resource "aws_api_gateway_deployment" "example" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.lambda_root,
  ]

  rest_api_id = aws_api_gateway_rest_api.api-gateway.id
  stage_name  = "test"
}

resource "aws_lambda_permission" "allow_apig" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.test_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api-gateway.execution_arn}/*/*/*"

  depends_on = [
    aws_api_gateway_rest_api.api-gateway,
    aws_api_gateway_resource.proxy,
  ]
}