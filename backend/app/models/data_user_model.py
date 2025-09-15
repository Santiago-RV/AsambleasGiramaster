from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class DataUserModel(Base):
    __tablename__ = "tbl_data_users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_name = Column(String, index=True, nullable=False)
    str_last_name = Column(String, index=True, nullable=False)
    str_email = Column(String, index=True, nullable=False)
    str_phone = Column(String, nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    users = relationship("UserModel", back_populates="data_user")