from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any]) -> str:
    # Refresh tokens are random strings, stored hashed in DB
    # But here we can validly use a JWT or a random string. 
    # The prompt asked for "Access token short-lived... refresh token longer... stored hashed in DB". 
    # Simple approach: Generate a random UUID-like string for refresh token.
    import secrets
    return secrets.token_urlsafe(32)

def hash_token(token: str) -> str:
    import hashlib
    return hashlib.sha256(token.encode()).hexdigest()


def mask_email(email: str) -> str:
    """Mask an email address for safe logging.

    Examples:
        admin@example.com -> a***n@example.com
        jo@test.org -> j***o@test.org
        a@b.com -> a***@b.com
    """
    if not email or '@' not in email:
        return '***'
    local, domain = email.rsplit('@', 1)
    if len(local) <= 1:
        masked_local = local[0] + '***'
    elif len(local) == 2:
        masked_local = local[0] + '***' + local[-1]
    else:
        masked_local = local[0] + '***' + local[-1]
    return f"{masked_local}@{domain}"


def mask_user_id(user_id: str) -> str:
    """Mask a user UUID for safe logging, showing only last 4 characters.

    Example: 550e8400-e29b-41d4-a716-446655440000 -> ***0000
    """
    if not user_id:
        return '***'
    return f"***{user_id[-4:]}"
