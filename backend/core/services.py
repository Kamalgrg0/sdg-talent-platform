"""Cross-cutting domain services: notifications and the transactional email outbox."""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

from notifications.models import EmailOutbox, Notification

from .links import normalize_frontend_link


def notify(user, type, title, message, link=None):
    """Create an in-app notification with a route that exists in the SPA."""
    return Notification.objects.create(
        user=user,
        type=type,
        title=title,
        message=message,
        link=normalize_frontend_link(link),
    )


def queue_email(user, subject, template, context, recipient_email=None, recipient_name=None):
    """Persist an outbox row, then attempt delivery immediately when configured."""
    context = {**context, "app_url": settings.APP_URL}
    try:
        body_html = render_to_string(f"emails/{template}.html", context)
        body_text = render_to_string(f"emails/{template}.txt", context)
    except Exception as exc:  # noqa: BLE001 - a missing template must not break the request
        body_html = ""
        body_text = context.get("preview") or subject
        last_error = f"Template error: {exc}"[:500]
    else:
        last_error = ""

    email = recipient_email or (user.email if user else None)
    name = recipient_name or (user.name if user else None)

    row = EmailOutbox.objects.create(
        user=user,
        recipient_email=email,
        recipient_name=name,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        status=EmailOutbox.Status.PENDING,
        last_error=last_error,
    )
    deliver_outbox_row(row)
    return row


def deliver_outbox_row(row):
    try:
        message = EmailMultiAlternatives(
            subject=row.subject,
            body=row.body_text,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[row.recipient_email],
        )
        message.attach_alternative(row.body_html, "text/html")
        message.send(fail_silently=False)
        row.status = EmailOutbox.Status.SENT
        row.sent_at = timezone.now()
        row.last_error = ""
        row.save(update_fields=["status", "sent_at", "last_error", "attempts"])
    except Exception as exc:  # noqa: BLE001 - outbox keeps failures inspectable
        row.attempts += 1
        row.status = EmailOutbox.Status.FAILED
        row.last_error = str(exc)[:500]
        row.save(update_fields=["status", "last_error", "attempts"])
    return row
