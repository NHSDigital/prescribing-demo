#!/usr/bin/env python
from urllib.parse import urlencode

import flask
import httpx

CLIENT_ID = "test"
CLIENT_SECRET = "test"

SIGN_URL = "/sign"
COMPLETE_FLOW = "/complete"
REDIRECT_URL_FOR_STATE = {"sign": SIGN_URL, "verify": COMPLETE_FLOW}

app = flask.Flask(__name__)


@app.route("/", methods=["GET"])
@app.route(SIGN_URL, methods=["GET"])
def get_sign():
    return render_client("sign")


@app.route(SIGN_URL, methods=["POST"])
def post_sign():
    return forward_request("sign")


@app.route(COMPLETE_FLOW, methods=["GET"])
def get_verify():
    token = flask.request.args.get('token', '')
    print(token)
    # get stuff from provider
    headers = {
        'Nhsd-Session-Urid': "1234",
        'x-nhsd-signing-app-id': CLIENT_ID,
        'x-nhsd-signing-app-secret': CLIENT_SECRET,
        'callback-url': "http://localhost:5000/sign"
    }
    payload = httpx.get(
        "http://localhost:9000/csc/v1/Payload?token=" + token,
        headers=headers
    )
    signature = httpx.get(
        "http://localhost:9000/csc/v1/Signature?token=" + token,
        headers=headers
    )
    print(signature.text)
    # display
    return payload.text, signature.text


@app.route(COMPLETE_FLOW, methods=["POST"])
def post_verify():
    return forward_request("verify")


@app.route("/login", methods=["GET"])
def get_login():
    state = flask.request.args.get("state", "sign")
    authorize_url = get_authorize_url(state)
    return flask.redirect(authorize_url)


@app.route("/logout", methods=["GET"])
def get_logout():
    state = flask.request.args.get("state", "sign")
    return redirect_and_set_cookies(state, "", 0)


@app.route("/callback", methods=["GET"])
def get_callback():
    return {"bluh": "bluh"}


def redirect_and_set_cookies(state, access_token_encrypted, cookie_expiry):
    return {"bluh": "bluh"}


def render_client(page_mode):
    return flask.render_template(
        "client.html",
        page_mode=page_mode
    )


def forward_request(path):
    headers = {
        'Nhsd-Session-Urid': "1234",
        'x-nhsd-signing-app-id': CLIENT_ID,
        'x-nhsd-signing-app-secret': CLIENT_SECRET,
        'callback-url': "http://localhost:5000/sign"
    }
    response = httpx.post(
        "http://localhost:9000/csc/v1/signatures/SignHash",
        json=flask.request.json,
        headers=headers
    )
    return response.content, response.status_code


def get_authorize_url(state):
    query_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "state": state,
    }
    return "bluh"


def exchange_code_for_token(code):
    return "bluh"


if __name__ == "__main__":
    app.run(port=5000, debug=True)
