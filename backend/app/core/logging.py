"""Логирование приложения.

Зачем это нужно отдельно: uvicorn настраивает только собственные логгеры
(`uvicorn`, `uvicorn.error`, `uvicorn.access`) и не добавляет обработчик
корневому — без явной настройки INFO-сообщения нашего кода (например, «создан
начальный суперпользователь») в консоль не попадают, видно только WARNING+.
Наблюдать это важно: именно в логе старта пользователь узнаёт, что
суперпользователь создан и строки SUPERADMIN_* можно удалить из .env.

Настраиваем только логгер `app` и его детей, не трогая root и uvicorn:
сторонние библиотеки продолжают работать со своими настройками.
"""
import logging


APP_LOGGER_NAME = 'app'
LOG_FORMAT = '%(levelname)s:     %(name)s: %(message)s'


def configure_app_logging(level: int = logging.INFO) -> None:
	"""Добавляет консольный обработчик логгеру `app`, если его ещё нет.

	Идемпотентна: повторный вызов (reload, тесты) не дублирует записи.
	"""
	logger = logging.getLogger(APP_LOGGER_NAME)
	if any(isinstance(handler, logging.StreamHandler) for handler in logger.handlers):
		logger.setLevel(level)
		return

	handler = logging.StreamHandler()
	handler.setFormatter(logging.Formatter(LOG_FORMAT))
	logger.addHandler(handler)
	logger.setLevel(level)
	# Свой обработчик уже есть — к root не пробрасываем, иначе строки удвоятся
	# в окружениях, где root тоже настроен (например, pytest или gunicorn).
	logger.propagate = False
