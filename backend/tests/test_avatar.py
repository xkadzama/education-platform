"""Unit-тесты обработки аватара (без HTTP и БД)."""
import io
import unittest

from PIL import Image

from app.services.avatar import AvatarProcessingError, process_avatar


def image_bytes(size: tuple[int, int], fmt: str = 'JPEG', mode: str = 'RGB') -> bytes:
	buffer = io.BytesIO()
	Image.new(mode, size, (255, 90, 0) if mode == 'RGB' else (255, 90, 0, 128)).save(
		buffer, format=fmt
	)
	return buffer.getvalue()


class AvatarProcessingTests(unittest.TestCase):
	def test_large_jpeg_is_resized_and_converted_to_webp(self):
		result = process_avatar(image_bytes((1400, 900)))
		image = Image.open(io.BytesIO(result))
		self.assertEqual(image.format, 'WEBP')
		self.assertLessEqual(max(image.size), 512)
		self.assertEqual(image.size, (512, 329))

	def test_small_image_is_not_upscaled(self):
		result = process_avatar(image_bytes((100, 80)))
		image = Image.open(io.BytesIO(result))
		self.assertEqual(image.size, (100, 80))

	def test_png_with_alpha_keeps_transparency(self):
		result = process_avatar(image_bytes((800, 800), fmt='PNG', mode='RGBA'))
		image = Image.open(io.BytesIO(result))
		self.assertEqual(image.mode, 'RGBA')

	def test_invalid_bytes_are_rejected(self):
		with self.assertRaises(AvatarProcessingError):
			process_avatar(b'not-an-image')

	def test_unsupported_format_is_rejected(self):
		buffer = io.BytesIO()
		Image.new('RGB', (50, 50)).save(buffer, format='GIF')
		with self.assertRaises(AvatarProcessingError):
			process_avatar(buffer.getvalue())


if __name__ == '__main__':
	unittest.main()
