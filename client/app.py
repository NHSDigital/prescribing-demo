#!/usr/bin/env python
import datetime
import os
from urllib.parse import urlencode

import json
import base64

import flask
import httpx
from cryptography.fernet import Fernet

OAUTH_SERVER_BASE_PATH = os.environ["OAUTH_SERVER_BASE_PATH"]
ELECTRONIC_PRESCRIPTION_API_BASE_PATH = os.environ["ELECTRONIC_PRESCRIPTION_API_BASE_PATH"]
ELECTRONIC_PRESCRIPTION_API_PREPARE_PATH = os.environ["ELECTRONIC_PRESCRIPTION_API_PREPARE_PATH"]
ELECTRONIC_PRESCRIPTION_API_SEND_PATH = os.environ["ELECTRONIC_PRESCRIPTION_API_SEND_PATH"]
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
SEND_URL = "/send"
REDIRECT_URL_FOR_STATE = {"sign": SIGN_URL, "send": SEND_URL}

fernet = Fernet(SESSION_TOKEN_ENCRYPTION_KEY.encode('utf-8'))
app = flask.Flask(__name__)


def exclude_from_auth(func):
    func._exclude_from_auth = False
    return func


@app.before_request
def auth_check():
    skip_auth = False

    if flask.request.endpoint in app.view_functions:
        view_func = app.view_functions[flask.request.endpoint]
        skip_auth = hasattr(view_func, '_exclude_from_auth')

    if not skip_auth:
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
    prescription = flask.request.json

    prepare_headers = {
        'NHSD-Session-URID': '1234'
    }

    prepare_response = httpx.post(
        f"{ELECTRONIC_PRESCRIPTION_API_BASE_PATH}/{ELECTRONIC_PRESCRIPTION_API_PREPARE_PATH}",
        headers=prepare_headers,
        json=prescription
    )

    prepare_response_body = prepare_response.json()
    parameter_map = {p['name']: p['valueString'] for p in prepare_response_body['parameter']}

    sign_headers = {
        'x-nhsd-signing-app-id': SIGNING_CLIENT_ID,
        'x-nhsd-signing-app-secret': SIGNING_CLIENT_SECRET
    }

    print(prepare_response_body)

    print(parameter_map)

    sign_response = httpx.post(
        f"{REMOTE_SIGNING_SERVER_BASE_PATH}/csc/v1/signatures/SignHash",
        headers=sign_headers,
        json={
            'algorithm': parameter_map['algorithm'],
            'payload': parameter_map['payload'],
            'display': parameter_map['display']
        },
        verify=False
    )

    sign_response_body = sign_response.json()

    return {
        'token': sign_response_body['token'],
        'redirectUri': sign_response_body['redirectUri'],
        'callbackUri': f'{SERVER_NAME}/send'
    }


@app.route(SEND_URL, methods=["GET"])
def get_send():
    token = flask.request.args.get('token', '')

    headers = {
        'x-nhsd-signing-app-id': SIGNING_CLIENT_ID,
        'x-nhsd-signing-app-secret': SIGNING_CLIENT_SECRET
    }

    payload_response = httpx.get(
        f"{REMOTE_SIGNING_SERVER_BASE_PATH}/csc/v1/signatures/SignHash/{token}",
        headers=headers
    )

    payload = payload_response.json()['payload']
    payload_decoded = base64.b64decode(payload.encode()).decode()

    signature_response = httpx.get(
        f"{REMOTE_SIGNING_SERVER_BASE_PATH}/csc/v1/Signature/{token}",
        headers=headers
    )

    signature = signature_response.json()['signature']
    certificate = signature_response.json()['certificate']

    xml_dsig = f"<Signature xmlns=\"http://www.w3.org/2000/09/xmldsig#\">{payload_decoded}" \
               f"<SignatureValue>{signature}</SignatureValue>" \
               f"<KeyInfo><X509Data><X509Certificate>{certificate}</X509Certificate></X509Data></KeyInfo>" \
               f"</Signature>"
    xml_dsig_encoded = base64.b64encode(xml_dsig.encode()).decode()

    return render_client('send', sign_response={
        'signature': xml_dsig_encoded
    })


@app.route(SEND_URL, methods=["POST"])
def post_send():
    prescription = flask.request.json

    send_prescription_response = httpx.post(
        f"{ELECTRONIC_PRESCRIPTION_API_BASE_PATH}/{ELECTRONIC_PRESCRIPTION_API_SEND_PATH}",
        json=prescription
    )

    return {
        'status_code': send_prescription_response.status_code
    }


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
@exclude_from_auth
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
    callback_response.set_cookie("Access-Token", access_token_encrypted, expires=cookie_expiry, secure=secure_flag,
                                 httponly=True)
    callback_response.set_cookie("Access-Token-Set", "true", expires=cookie_expiry, secure=secure_flag)
    return callback_response


def render_client(page_mode, sign_response=None, send_response=None):
    print(send_response)
    return flask.render_template(
        "client.html",
        page_mode=page_mode,
        sign_response=sign_response,
        send_response=send_response
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
