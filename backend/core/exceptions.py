"""Consistent, readable error responses for the React API client."""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def _plain_errors(value):
    """Recursively turn DRF ErrorDetail values into JSON-friendly messages.

    str([ErrorDetail(...)]) includes the Python representation of the objects;
    convert each leaf before preparing the response instead.
    """
    if isinstance(value, dict):
        return {str(key): _plain_errors(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_plain_errors(item) for item in value]
    if value is None:
        return None
    return str(value)


def _first_message(value):
    """Return the first human-readable message from nested validation data."""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for item in value:
            message = _first_message(item)
            if message:
                return message
    if isinstance(value, dict):
        for item in value.values():
            message = _first_message(item)
            if message:
                return message
    return ""


def api_exception_handler(exc, context):
    """Wrap DRF errors consistently; don't expose unexpected exception details."""
    response = exception_handler(exc, context)
    if response is None:
        logger.exception("Unhandled API error: %s", exc)
        return Response(
            {"detail": "Something went wrong. Please try again.", "errors": None},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    detail = _plain_errors(response.data)
    message = "Request failed."
    errors = None

    if isinstance(detail, dict):
        if "detail" in detail:
            message = _first_message(detail["detail"]) or message
            # Preserve additional field errors when provided alongside detail.
            remaining = {key: value for key, value in detail.items() if key != "detail"}
            errors = remaining or None
        else:
            message = "Please correct the highlighted fields."
            errors = detail
    elif isinstance(detail, list):
        message = _first_message(detail) or message
    elif detail:
        message = str(detail)

    response.data = {"detail": message, "errors": errors}
    return response
