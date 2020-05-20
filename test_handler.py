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

def test_post_request(client):
    post_request_data = {"data": "post request data"}
    post_request_alg = b'"alg":"sha256"'
    post_request_data_encoded = json.dumps(post_request_data).encode()
    post_request_hashed = hashlib.sha256(post_request_data_encoded).hexdigest().encode()
    post_request_signature_response = bytes(post_request_hashed)

    response = client.post('/sign', json=post_request_data)
    response_contains_cors_headers(response)
    assert status_code in response.data
    assert post_request_alg in response.data
    assert post_request_signature_response in response.data

def response_contains_cors_headers(response):
    assert 'Access-Control-Allow-Origin' in response.headers
    assert response.headers.get('Access-Control-Allow-Origin') == '*'