from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class PollResponseModel(Base):
    __tablename__ = "tbl_poll_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_poll_id = Column(Integer, ForeignKey("tbl_polls.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    int_option_id = Column(Integer, ForeignKey("tbl_poll_options.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False)
    str_response_text = Column(String(1000), nullable=True)
    dec_response_number = Column(Numeric, nullable=True)
    dec_voting_weight = Column(Numeric, nullable=False)
    bln_is_abstention = Column(Boolean, default=False)
    dat_response_at = Column(DateTime, nullable=False)
    str_ip_address = Column(String(45), nullable=False)
    str_user_agent = Column(String(500), nullable=False)

    created_at = Column(DateTime, default=datetime.now)

    poll = relationship("PollModel", back_populates="responses")
    option = relationship("PollOptionModel", back_populates="responses")