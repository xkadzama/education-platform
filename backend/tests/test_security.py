"""Unit-тесты безопасности: Argon2 и JWT (без БД и сети)."""
import unittest

import jwt

from app.core.security import (
	create_access_token,
	create_refresh_token,
	decode_token,
	get_password_hash,
	verify_password,
)


class PasswordTests(unittest.TestCase):
	def test_hash_and_verify(self):
		hashed = get_password_hash('Secret123')
		self.assertNotEqual(hashed, 'Secret123')
		self.assertTrue(verify_password('Secret123', hashed))
		self.assertFalse(verify_password('Wrong123', hashed))


class TokenTests(unittest.TestCase):
	def test_access_token_roundtrip(self):
		token = create_access_token(42, 'student')
		payload = decode_token(token, expected_type='access')
		self.assertEqual(payload['sub'], '42')
		self.assertEqual(payload['role'], 'student')
		self.assertEqual(payload['type'], 'access')

	def test_refresh_token_cannot_be_used_as_access(self):
		token = create_refresh_token(42, 'student')
		with self.assertRaises(jwt.InvalidTokenError):
			decode_token(token, expected_type='access')

	def test_access_token_cannot_be_used_as_refresh(self):
		token = create_access_token(42, 'student')
		with self.assertRaises(jwt.InvalidTokenError):
			decode_token(token, expected_type='refresh')

	def test_tampered_token_is_rejected(self):
		token = create_access_token(42, 'student')
		with self.assertRaises(jwt.PyJWTError):
			decode_token(token[:-2] + 'xx', expected_type='access')


if __name__ == '__main__':
	unittest.main()
