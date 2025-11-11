from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class ResidentialUnitModel(Base):
    __tablename__ = "tbl_residential_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    str_residential_code = Column(String(50), index=True, nullable=False)
    str_name = Column(String(200), index=True, nullable=False)
    str_nit = Column(String(50), index=True, nullable=False)
    str_unit_type = Column(String(50), index=True, nullable=False)
    int_total_apartments = Column(Integer, nullable=False)
    str_address = Column(String(500), nullable=False)
    str_city = Column(String(100), nullable=False)
    str_state = Column(String(100), nullable=False)
    bln_is_active = Column(Boolean, default=True)
    int_max_concurrent_meetings = Column(Integer, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)
    created_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    updated_by = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)

    # Relationships
    meetings = relationship("MeetingModel", back_populates="residential_unit")
    creator = relationship("UserModel", foreign_keys=[created_by], lazy="selectin")
    updater = relationship("UserModel", foreign_keys=[updated_by], lazy="selectin")