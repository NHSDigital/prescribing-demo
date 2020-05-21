import base64

import pytest
import json
from handler import app
import hashlib

status_code = b'"statusCode":200'
app.testing = True

@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

def test_get_request(client):
    get_request_response = b'"body":"Hello, world"'

    response = client.get('/')
    response_contains_cors_headers(response)
    assert status_code in response.data
    assert get_request_response in response.data

def test_sign_request(client):
    sign_request = {"payload": "eyJkYXRhIjogInBsZWFzZSBzaWduIHRoaXMifQ=="}
    sign_request_alg = b'"alg":"sha256"'

    sign_request_data_encoded = base64.b64decode(sign_request["payload"])
    sign_request_hashed = hashlib.sha256(sign_request_data_encoded).hexdigest().encode()
    sign_request_signature_response = bytes(sign_request_hashed)

    response = client.post('/sign', json=sign_request)
    response_contains_cors_headers(response)
    assert status_code in response.data
    assert sign_request_alg in response.data
    assert sign_request_signature_response in response.data

def test_verify_request(client):
    request_data_to_verify = "eyJkYXRhIjogInBsZWFzZSBzaWduIHRoaXMifQ=="
    verify_request_data_signed = hashlib.sha256(base64.b64decode(request_data_to_verify)).hexdigest()
    verify_request = {"payload": request_data_to_verify, "signature": verify_request_data_signed}

    response = client.post('/verify', json=verify_request)
    response_contains_cors_headers(response)
    assert status_code in response.data
    assert b'"valid":true' in response.data

def response_contains_cors_headers(response):
    assert 'Access-Control-Allow-Origin' in response.headers
    assert response.headers.get('Access-Control-Allow-Origin') == '*'