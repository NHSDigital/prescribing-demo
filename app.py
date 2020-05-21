#!/usr/bin/env python
import os
from urllib.parse import urlencode

import httpx
import uvicorn
from fastapi import FastAPI
from starlette.requests import Request
from starlette.staticfiles import StaticFiles
from starlette.templating import Jinja2Templates

app = FastAPI()
app.mount("/assets", StaticFiles(directory="client/assets"), name="assets")
templates = Jinja2Templates(directory="client")

# Configure
OAUTH_SERVER_BASE_PATH = os.environ["OAUTH_SERVER_BASE_PATH"]
REDIRECT_URI = os.environ["REDIRECT_URI"]
CLIENT_ID = os.environ["CLIENT_ID"]
CLIENT_SECRET = os.environ["CLIENT_SECRET"]
APP_NAME = os.environ["APP_NAME"]


@app.get("/")
def read_root(request: Request):
    return templates.TemplateResponse(
        "client.html",
        {
            "request": request,
            "signin_url": get_signin_url(),
            "bearer_token": None,
        }
    )


@app.get("/callback")
def do_callback(request: Request, code: str, state: str):
    formdata = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }
    response = httpx.post(OAUTH_SERVER_BASE_PATH + "token", data=formdata)
    response_json = response.json()
    return templates.TemplateResponse(
        "client.html",
        {
            "request": request,
            "signin_url": get_signin_url(),
            "bearer_token": response_json["access_token"],
        },
    )


def get_signin_url():
    query_params = {
        "client_id": CLIENT_ID,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "state": "1234567890",
    }
    return OAUTH_SERVER_BASE_PATH + "authorize?" + urlencode(query_params)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)
