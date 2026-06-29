"""Kavenegar SMS transport."""

from __future__ import annotations

from kavenegar import APIException, HTTPException, KavenegarAPI

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class KavenegarClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        sender: str | None = None,
    ) -> None:
        self._api_key = api_key if api_key is not None else settings.KAVENEGAR_API_KEY
        self._sender = sender if sender is not None else settings.KAVENEGAR_SENDER

    def send_sms(self, phone: str, message: str) -> bool:
        if not settings.SMS_ENABLED:
            logger.info(
                "sms_skipped",
                extra={"event": "sms_skipped", "reason": "disabled"},
            )
            return False
        if not self._api_key:
            logger.error(
                "sms_failed",
                extra={"event": "sms_failed", "reason": "missing_api_key"},
            )
            return False
        try:
            api = KavenegarAPI(self._api_key)
            api.sms_send(
                {
                    "sender": self._sender,
                    "receptor": phone,
                    "message": message,
                }
            )
            logger.info(
                "sms_sent",
                extra={"event": "sms_sent", "phone_masked": f"{phone[:4]}***"},
            )
            return True
        except (APIException, HTTPException) as exc:
            logger.error(
                "sms_failed",
                extra={"event": "sms_failed", "error": str(exc)},
            )
            return False


_default_client = KavenegarClient()


def send_sms(phone: str, message: str) -> bool:
    return _default_client.send_sms(phone, message)
