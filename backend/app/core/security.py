from pwdlib import PasswordHash


argon2 = PasswordHash.recommended()


def get_password_hash(password: str) -> str:
	return argon2.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
	return argon2.verify(password, hashed_password)