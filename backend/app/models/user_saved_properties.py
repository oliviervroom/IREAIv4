from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class UserSavedProperty(Base):
    __tablename__ = "user_saved_properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="saved_properties")
    property = relationship("Property", back_populates="saved_by") 