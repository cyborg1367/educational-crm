from enum import Enum


class CommunicationChannel(str, Enum):
    email = "email"
    sms = "sms"
    phone = "phone"
    in_person = "in_person"
    chat = "chat"


class CommunicationDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"
