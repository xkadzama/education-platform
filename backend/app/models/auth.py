from datetime import datetime
from sqlalchemy import String, Integer, func, Boolean, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship

from app.core.database import Base


class User(Base):
	__tablename__ = 'users'

	id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
	email: Mapped[str] = mapped_column(String, unique=True, index=True)
	hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
	first_name: Mapped[str] = mapped_column(String(100), nullable=False)
	last_name: Mapped[str] = mapped_column(String(100), nullable=False)
	role: Mapped[str] = mapped_column(String, default='student', nullable=False)
	is_active: Mapped[bool] = mapped_column(Boolean,default=True,nullable=False)
	created_at: Mapped[datetime] = mapped_column(server_default=func.now())
	updated_at: Mapped[datetime] = mapped_column(server_default=func.now(),onupdate=func.now())