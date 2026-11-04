"""Unauthenticated identities for an explicitly opted-in local demo only."""

import time
from typing import Literal

import jwt
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.services.jwt_auth import InvalidToken, local_key
from app.services.user_auth import DEMO_USERS, seed_demo_users, user_principal

router = APIRouter(prefix="/auth", tags=["Local demo authentication"])


def local_only() -> None:
    if settings.AUTH_MODE != "local" or settings.ENVIRONMENT == "production":
        raise HTTPException(404, "Not found")


class DevLogin(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user: Literal["owner", "viewer"] = "owner"


@router.get("/dev-users", dependencies=[Depends(local_only)])
def dev_users(
    response: Response, db: Session = Depends(get_db)
) -> list[dict[str, str]]:
    response.headers["Cache-Control"] = "no-store"
    seed_demo_users(db)
    return [{"name": name, "id": subject} for name, subject in DEMO_USERS.items()]


@router.post("/dev-login", dependencies=[Depends(local_only)])
def dev_login(
    body: DevLogin, response: Response, db: Session = Depends(get_db)
) -> dict:
    seed_demo_users(db)
    now = int(time.time())
    claims = {
        "sub": DEMO_USERS[body.user],
        "iss": "relaymark-local",
        "aud": "relaymark-demo",
        "iat": now,
        "nbf": now,
        "exp": now + 900,
    }
    try:
        user_principal(db, claims)
    except InvalidToken:
        raise HTTPException(
            401, "Invalid credentials", headers={"WWW-Authenticate": "Bearer"}
        ) from None
    response.headers["Cache-Control"] = "no-store"
    return {
        "access_token": jwt.encode(claims, local_key(), algorithm="RS256"),
        "token_type": "bearer",
        "expires_in": 900,
    }
