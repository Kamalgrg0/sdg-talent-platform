"""Deliver queued email outbox rows.

Queued emails are attempted immediately when created, so this worker exists for
retries and for deployments that prefer an out-of-band delivery process.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from core.services import deliver_outbox_row
from notifications.models import EmailOutbox


class Command(BaseCommand):
    help = "Send pending or failed emails from the email_outbox table."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)
        parser.add_argument("--retry-failed", action="store_true")

    def handle(self, *args, **options):
        statuses = [EmailOutbox.Status.PENDING]
        if options["retry_failed"]:
            statuses.append(EmailOutbox.Status.FAILED)

        rows = list(
            EmailOutbox.objects.filter(status__in=statuses).order_by("created_at")[: options["limit"]]
        )
        sent = failed = 0
        for row in rows:
            result = deliver_outbox_row(row)
            if result.status == EmailOutbox.Status.SENT:
                sent += 1
            else:
                failed += 1
                self.stderr.write(f"Failed #{row.id} to {row.recipient_email}: {row.last_error}")
        self.stdout.write(
            self.style.SUCCESS(f"Processed {len(rows)} emails: {sent} sent, {failed} failed.")
        )
