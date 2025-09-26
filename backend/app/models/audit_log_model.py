from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime

class AuditLogModel(Base):
    __tablename__ = "tbl_audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    int_user_id = Column(Integer, ForeignKey("tbl_users.id"), nullable=False)
    str_action = Column(String(100), index=True, nullable=False)
    str_ip_address = Column(String(50), index=True, nullable=False)
    str_user_agent = Column(String(50), index=True, nullable=False)
    str_resource_type = Column(String(50), index=True, nullable=False)
    int_resource_id = Column(Integer, nullable=False)
    str_resource_name = Column(String(200), nullable=False)
    json_old_data = Column(JSON, nullable=False)
    json_new_data = Column(JSON, nullable=False)
    str_changes_summary = Column(String(1000), nullable=False)
    int_meeting_id = Column(Integer, ForeignKey("tbl_meetings.id"), nullable=False)
    str_severity = Column(String(50), index=True, nullable=False)
    json_tags = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.now)

