from pydantic import BaseModel

class URLCreate(BaseModel):
    long_url: str

class URLResponse(BaseModel):
    short_code: str