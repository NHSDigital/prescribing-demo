from flask import Flask, request
import serverless_wsgi
import hashlib
app = Flask(__name__)

@app.route('/', methods=['GET'])
def hello_world():
    return {
        "statusCode": 200,
        "body": "Hello, world"
    }

@app.route('/sign', methods=['POST'])
def sign():
    return {
        "statusCode": 200,
        "signature": hashlib.sha256(request.data).hexdigest(),
        "alg": "sha256"
    }

@app.after_request
def set_access_control(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    return response

if __name__ == "__main__":
    app.run(debug=True)

def main_handler(event, context):
    return serverless_wsgi.handle_request(app.wsgi_app, event, context)