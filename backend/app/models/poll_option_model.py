from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class PollOptionModel(Base):
    __tablename__ = "tbl_poll_options"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_poll_id = Column(Integer, ForeignKey("tbl_polls.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    str_option_text = Column(String(500), index=True, nullable=False)
    int_option_order = Column(Integer, nullable=False)
    bln_is_active = Column(Boolean, default=True)
    int_votes_count = Column(Integer, nullable=False)
    dec_weight_total = Column(Numeric, nullable=False)
    dec_percentage = Column(Numeric, nullable=False)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    poll = relationship("PollModel", back_populates="options")
    responses = relationship("PollResponseModel", back_populates="option", cascade="all, delete-orphan")