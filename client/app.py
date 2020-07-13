#!/usr/bin/env python
import datetime
import os
from urllib.parse import urlencode

import flask
import httpx
from cryptography.fernet import Fernet


OAUTH_SERVER_BASE_PATH = os.environ["OAUTH_SERVER_BASE_PATH"]
REMOTE_SIGNING_SERVER_BASE_PATH = os.environ["REMOTE_SIGNING_SERVER_BASE_PATH"]
REDIRECT_URI = os.environ["REDIRECT_URI"]
CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET = os.environ["CLIENT_SECRET"]
SIGNING_CLIENT_ID = os.environ["SIGNING_CLIENT_ID"]
SIGNING_CLIENT_SECRET = os.environ["SIGNING_CLIENT_SECRET"]
SERVER_NAME = os.environ["SERVER_NAME"]
APP_NAME = os.environ["APP_NAME"]
SESSION_TOKEN_ENCRYPTION_KEY = os.environ["SESSION_TOKEN_ENCRYPTION_KEY"]
DEV_MODE = os.environ.get("DEV_MODE", False)

SIGN_URL = "/sign"
VERIFY_URL = "/verify"
COMPLETE_FLOW = "/complete"
REDIRECT_URL_FOR_STATE = {"sign": SIGN_URL, "complete": COMPLETE_FLOW}

fernet = Fernet(SESSION_TOKEN_ENCRYPTION_KEY.encode('utf-8'))
app = flask.Flask(__name__)

@app.before_request
def before_request():
    access_token_encrypted = flask.request.cookies.get("Access-Token")
    if access_token_encrypted is not None:
        try:
            fernet.decrypt(access_token_encrypted.encode('utf-8')).decode('utf-8')
        except:
            return login()
    else:
        return login()

@app.route("/", methods=["GET"])
@app.route(SIGN_URL, methods=["GET"])
def get_sign():
    return render_client("sign")


@app.route(SIGN_URL, methods=["POST"])
def post_sign():

    headers = {
        'x-nhsd-signing-app-id': SIGNING_CLIENT_ID,
        'x-nhsd-signing-app-secret': SIGNING_CLIENT_SECRET
    }

    response = httpx.post(
        f"{REMOTE_SIGNING_SERVER_BASE_PATH}/csc/v1/signatures/SignHash",
        headers = headers,
        json=flask.request.json
    )

    response_body = response.json()

    return {
        'token': response_body.get('token'),
        'redirectUri': response_body.get('redirectUri'),
        'callbackUri': f'{SERVER_NAME}/complete'
    }


@app.route(COMPLETE_FLOW, methods=["GET"])
def get_complete():
    token = flask.request.args.get('token', '')

    headers = {
        'x-nhsd-signing-app-id': SIGNING_CLIENT_ID,
        'x-nhsd-signing-app-secret': SIGNING_CLIENT_SECRET
    }

    response = httpx.get(
        f"{REMOTE_SIGNING_SERVER_BASE_PATH}/csc/v1/Signature?token={token}",
        headers=headers
    )

    return render_client('sign', {
        'status_code': response.status_code,
        'status_text': '',
        'body': response.json()['signature']
    })


@app.route(VERIFY_URL, methods=["GET"])
def get_verify():
    return render_client("verify")


@app.route(VERIFY_URL, methods=["POST"])
def post_verify():
    # Need to re-integrate with the verify endpoint

    return {
        'valid': False
    }


def login():
    state = flask.request.args.get("state", "sign")
    authorize_url = get_authorize_url(state)
    return flask.redirect(authorize_url)


@app.route("/logout", methods=["GET"])
def get_logout():
    state = flask.request.args.get("state", "sign")
    return redirect_and_set_cookies(state, "", 0)


@app.route("/callback", methods=["GET"])
def get_callback():
    state = flask.request.args.get("state", "sign")
    code = flask.request.args.get("code")
    token_response_json = exchange_code_for_token(code)
    access_token = token_response_json["access_token"]
    expires_in = token_response_json["expires_in"]
    access_token_encrypted = fernet.encrypt(access_token.encode('utf-8')).decode('utf-8')
    expires = datetime.datetime.utcnow() + datetime.timedelta(seconds=float(expires_in))
    return redirect_and_set_cookies(state, access_token_encrypted, expires)


def redirect_and_set_cookies(state, access_token_encrypted, cookie_expiry):
    redirect_url = REDIRECT_URL_FOR_STATE.get(state, "sign")
    callback_response = flask.redirect(redirect_url)
    secure_flag = not DEV_MODE
    callback_response.set_cookie("Access-Token", access_token_encrypted, expires=cookie_expiry, secure=secure_flag, httponly=True)
    callback_response.set_cookie("Access-Token-Set", "true", expires=cookie_expiry, secure=secure_flag)
    return callback_response


def render_client(page_mode, sign_response=None):
    return flask.render_template(
        "client.html",
        page_mode=page_mode,
        sign_response=sign_response
    )

def get_authorize_url(state):
    query_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "state": state,
    }
    return f"{OAUTH_SERVER_BASE_PATH}authorize?{urlencode(query_params)}"


def exchange_code_for_token(code):
    token_response = httpx.post(
        f"{OAUTH_SERVER_BASE_PATH}token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
        }
    )
    return token_response.json()

if __name__ == "__main__":
    app.run(port=5000, debug=DEV_MODE)
