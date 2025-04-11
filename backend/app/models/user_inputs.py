from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base

class UserInput(Base):
    __tablename__ = "user_inputs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    name = Column(String)
    vacancy_rate = Column(Float, default=5.0)
    management_rate = Column(Float, default=10.0)
    advertising_cost_per_vacancy = Column(Float, default=100.0)
    repairs = Column(Float, default=5000.0)
    repairs_contingency = Column(Float, default=0.0)
    lender_fee = Column(Float, default=10000.0)
    broker_fee = Column(Float, default=500.0)
    environmentals = Column(Float, default=0.0)
    inspections = Column(Float, default=1300.0)
    appraisals = Column(Float, default=1000.0)
    misc = Column(Float, default=500.0)
    legal = Column(Float, default=4000.0)
    mtg_amortization_period = Column(Integer, default=30)
    first_mtg_interest_rate = Column(Float, default=6.5)
    first_mtg_amortization_period = Column(Integer, default=30)
    first_mtg_cmhc_fee = Column(Float, default=0.0)
    second_mtg_principle = Column(Float, default=0.0)
    second_mtg_interest_rate = Column(Float, default=12.0)
    second_mtg_amortization = Column(Integer, default=9999)
    interest_only_principle = Column(Float, default=0.0)
    interest_only_rate = Column(Float, default=0.0)
    other_monthly_financing = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Set other fields with their defaults...
    # You can add more fields as needed based on your user_inputs.py file in items/
    
    # Relationships
    user = relationship("User", back_populates="inputs") 