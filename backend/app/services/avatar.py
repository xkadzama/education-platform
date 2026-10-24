"""Обработка загружаемого аватара: валидация, EXIF-поворот, ресайз, WebP.

Вынесено из HTTP-слоя, чтобы можно было тестировать без FastAPI и БД.
"""
import io

from PIL import Image, ImageOps

from app.core.config import AVATAR_MAX_DIMENSION, AVATAR_MAX_PIXELS


ALLOWED_IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP'}


class AvatarProcessingError(ValueError):
	"""Файл не является корректным JPEG/PNG/WebP или превышает лимиты."""


def process_avatar(data: bytes) -> bytes:
	"""Возвращает сжатый WebP (не больше AVATAR_MAX_DIMENSION по стороне).

	Не увеличивает маленькие изображения. Прозрачность сохраняется.
	"""
	try:
		image = Image.open(io.BytesIO(data))
		if image.format not in ALLOWED_IMAGE_FORMATS:
			raise AvatarProcessingError(f'Unsupported image format: {image.format}')
		if image.width * image.height > AVATAR_MAX_PIXELS:
			raise AvatarProcessingError('Image has too many pixels')

		image.load()  # полное декодирование, а не только заголовок
		image = ImageOps.exif_transpose(image)
		image.thumbnail(
			(AVATAR_MAX_DIMENSION, AVATAR_MAX_DIMENSION),
			Image.Resampling.LANCZOS,
		)

		has_alpha = image.mode in {'RGBA', 'LA'} or (
			image.mode == 'P' and 'transparency' in image.info
		)
		image = image.convert('RGBA' if has_alpha else 'RGB')

		output = io.BytesIO()
		image.save(output, format='WEBP', quality=85, method=6)
		return output.getvalue()
	except AvatarProcessingError:
		raise
	except Exception as exc:  # битый файл, неподдерживаемый кодек и т.п.
		raise AvatarProcessingError('File is not a valid JPEG, PNG or WebP image') from exc
