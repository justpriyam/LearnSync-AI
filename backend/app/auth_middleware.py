"""JWT authentication middleware for FastAPI.

Verifies NextAuth.js JWT tokens using the shared NEXTAUTH_SECRET.
Provides get_current_user dependency for route protection.
"""
import jwt
from fastapi import Depends, HTTPException, status, Request
from typing import Optional

from app.config import settings


def _extract_token(request: Request) -> Optional[str]:
    """Extract Bearer token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def get_current_user(request: Request) -> str:
    """FastAPI dependency that extracts and verifies the user ID from JWT.
    
    Returns the user_id (Google sub) from the token.
    Raises 401 if token is missing or invalid.
    """
    token = _extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not settings.NEXTAUTH_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auth not configured on server",
        )
    
    try:
        payload = jwt.decode(
            token,
            settings.NEXTAUTH_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no user ID",
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


def get_optional_user(request: Request) -> Optional[str]:
    """Like get_current_user but returns None instead of raising 401.
    
    Useful for endpoints that work both authenticated and unauthenticated.
    """
    token = _extract_token(request)
    if not token or not settings.NEXTAUTH_SECRET:
        return None
    try:
        payload = jwt.decode(
            token,
            settings.NEXTAUTH_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False},
        )
        return payload.get("sub")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None
