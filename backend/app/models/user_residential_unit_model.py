from sqlalchemy import Column, Integer, Numeric, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class UserResidentialUnitModel(Base):
    __tablename__ = "tbl_user_residential_units"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    int_residential_unit_id = Column(Integer, ForeignKey("tbl_residential_units.id"), nullable=False)
    str_apartment_number = Column(String(50), nullable=False)
    bools_is_admin = Column(Boolean, default=False)
    dec_default_voting_weight = Column(Numeric(10, 4), nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

    # Relationships
    user = relationship("UserModel", backref="residential_units", lazy="selectin")
    residential_unit = relationship("ResidentialUnitModel", backref="user_units", lazy="selectin")