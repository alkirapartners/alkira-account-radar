from fastapi import Header, HTTPException


async def require_partner_email(x_auth_email: str | None = Header(default=None)) -> str:
    """Trust the X-Auth-Email header set by nginx.

    FastAPI binds to 127.0.0.1 only. nginx strips any client-supplied
    X-Auth-Email and sets its own from the auth-proxy result. Therefore
    receiving this header here is sufficient proof of authentication.
    """
    if not x_auth_email:
        raise HTTPException(status_code=401, detail="missing auth")
    if "@" not in x_auth_email:
        raise HTTPException(status_code=401, detail="invalid auth")
    return x_auth_email.lower()
