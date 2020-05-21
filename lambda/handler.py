from flask import Flask, request
import serverless_wsgi
import hashlib
import base64
import binascii
app = Flask(__name__)


@app.route('/', methods=['GET'])
def hello_world():
    return {
        "statusCode": 200,
        "body": "Hello, world"
    }


@app.route('/sign', methods=['POST'])
def sign():
    data = request.json
    try:
        payload = base64.b64decode(data["payload"])
        return {
            "statusCode": 200,
            "signature": hashlib.sha256(payload).hexdigest(),
            "alg": "sha256"
        }
    except binascii.Error:
        return {"statusCode": 400,
                "error": "payload no base64 encoded"}


@app.route('/verify', methods=['POST'])
def verify():
    request_json = request.json
    try:
        request_data = base64.b64decode(request_json["payload"])
        signature = request_json["signature"]
        signed_data = hashlib.sha256(bytes(request_data)).hexdigest()
        return {
            "statusCode": 200,
            "valid": signed_data == signature,
        }
    except binascii.Error:
        return {"statusCode": 400,
                "error": "payload no base64 encoded"}


@app.after_request
def set_access_control(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response


if __name__ == "__main__":
    app.run(debug=True)


def main_handler(event, context):
    return serverless_wsgi.handle_request(app.wsgi_app, event, context)