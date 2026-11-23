import base64
import hashlib
import hmac
import secrets

N, R, P = 2**14, 8, 1


def _digest(password: str, salt: bytes, n: int, r: int, p: int) -> bytes:
    return hashlib.scrypt(password.encode(), salt=salt, n=n, r=r, p=p)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    encoded = (base64.b64encode(part).decode() for part in (salt, _digest(password, salt, N, R, P)))
    return f"scrypt${N}${R}${P}${'$'.join(encoded)}"


UNKNOWN_USER_HASH = hash_password(secrets.token_hex(16))


def verify_password(password: str, stored: str | None) -> bool:
    scheme, n, r, p, salt, digest = (stored or UNKNOWN_USER_HASH).split("$")
    if scheme != "scrypt":
        return False
    candidate = _digest(password, base64.b64decode(salt), int(n), int(r), int(p))
    return hmac.compare_digest(candidate, base64.b64decode(digest)) and stored is not None
