"""Unit-тесты валидации схем регистрации."""
import unittest

from pydantic import ValidationError

from app.schemas.auth import UserRegisterRequest


def register_request(password: str) -> UserRegisterRequest:
	return UserRegisterRequest(
		email='student@example.com',
		password=password,
		first_name='Иван',
		last_name='Петров',
	)


class RegisterSchemaTests(unittest.TestCase):
	def test_valid_password(self):
		request = register_request('Password1')
		self.assertEqual(request.email, 'student@example.com')

	def test_password_without_digit_is_rejected(self):
		with self.assertRaises(ValidationError):
			register_request('PasswordOnly')

	def test_password_without_uppercase_is_rejected(self):
		with self.assertRaises(ValidationError):
			register_request('password1')

	def test_short_password_is_rejected(self):
		with self.assertRaises(ValidationError):
			register_request('Pass1')


if __name__ == '__main__':
	unittest.main()
