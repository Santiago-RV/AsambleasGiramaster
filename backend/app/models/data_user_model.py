from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.utils.timezone_utils import colombia_now

class DataUserModel(Base):
    __tablename__ = "tbl_data_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_firstname = Column(String(100), index=True, nullable=False)
    str_lastname = Column(String(100), index=True, nullable=False)
    str_email = Column(String(255), index=True, nullable=False)
    str_phone = Column(String(20), nullable=True)

    created_at = Column(DateTime, default=colombia_now)
    updated_at = Column(DateTime, default=colombia_now)

    users = relationship("UserModel", back_populates="data_user")