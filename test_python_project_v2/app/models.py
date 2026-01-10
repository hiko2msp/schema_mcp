from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime, timezone

Base = declarative_base()


class UserGroup(Base):
    __tablename__ = "user_groups"

    id = Column(Integer, primary_key=True, index=True)
    group_name = Column(String, unique=True, index=True, nullable=False)
    total_click_count = Column(Integer, default=0, nullable=False)

    users = relationship("UserClick", back_populates="group")


class UserClick(Base):
    __tablename__ = "user_clicks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    click_count = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    group_id = Column(Integer, ForeignKey("user_groups.id"))
    group = relationship("UserGroup", back_populates="users")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "click_count": self.click_count,
            "updated_at": self.updated_at.isoformat() if self.updated_at is not None else None,
            "group_name": self.group.group_name if self.group else None,
        }
