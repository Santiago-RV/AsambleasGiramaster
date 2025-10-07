from pydantic import BaseModel, Field
from datetime import datetime

class PollResponseBase(BaseModel):
    id: int = Field(..., description="The ID of the poll response")
    int_poll_id: int = Field(..., description="The ID of the poll")
    int_user_id: int = Field(..., description="The ID of the user")
    int_option_id: int = Field(..., description="The ID of the option")
    str_response_text: str = Field(..., description="The text of the response")
    dec_response_number: float = Field(..., description="The number of the response")
    dec_voting_weight: float = Field(..., description="The voting weight of the response")
    bln_is_abstention: bool = Field(..., description="Whether the response is an abstention")
    dat_response_at: datetime = Field(..., description="The date and time of the response")
    str_ip_address: str = Field(..., description="The IP address of the response")
    str_user_agent: str = Field(..., description="The user agent of the response")

class PollResponseCreate(PollResponseBase):
    created_at: datetime = Field(..., description="The date and time of the creation")

class PollResponseUpdate(PollResponseBase):
    pass