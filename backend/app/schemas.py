import re
from datetime import date
from pydantic import BaseModel, EmailStr, field_validator, model_validator

NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .'-]{1,59}$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")  # 10-digit Indian mobile number


class PassengerIn(BaseModel):
    name: str
    email: EmailStr
    phone: str

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join((v or "").split())
        if not v:
            raise ValueError("Passenger name is required")
        if not NAME_RE.match(v):
            raise ValueError("Passenger name must be 2-60 letters (spaces, . ' - allowed)")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        v = re.sub(r"[\s-]", "", v or "")
        if v.startswith("+91"):
            v = v[3:]
        if not v:
            raise ValueError("Phone number is required")
        if not PHONE_RE.match(v):
            raise ValueError("Phone must be a valid 10-digit mobile number")
        return v


class HoldIn(BaseModel):
    train_id: int
    travel_date: date
    cls: str
    seat_ids: list[int]
    passengers: list[PassengerIn]  # passengers[i] travels in seat_ids[i]

    @field_validator("seat_ids")
    @classmethod
    def _seats(cls, v: list[int]) -> list[int]:
        if not v:
            raise ValueError("Select at least one seat")
        if len(set(v)) != len(v):
            raise ValueError("Duplicate seats selected")
        return v

    @model_validator(mode="after")
    def _one_passenger_per_seat(self):
        if len(self.passengers) != len(self.seat_ids):
            raise ValueError(
                f"Passenger details must be given for every seat: {len(self.seat_ids)} seat(s) selected "
                f"but {len(self.passengers)} passenger(s) provided"
            )
        return self


class PayIn(BaseModel):
    success: bool = True  # mock gateway result
