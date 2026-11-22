"""Send a one-off test email using the configured backend."""
from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email to verify the SMTP settings in backend/.env."

    def add_arguments(self, parser):
        parser.add_argument("--to", required=True, help="Recipient address for the test message.")

    def handle(self, *args, **options):
        recipient = options["to"]
        if settings.EMAIL_BACKEND.endswith("console.EmailBackend"):
            self.stderr.write(
                "EMAIL_BACKEND is still 'console': the message will be printed here instead of "
                "being delivered. Set EMAIL_BACKEND=smtp in backend/.env first."
            )
        if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend") and not settings.EMAIL_HOST:
            raise CommandError("EMAIL_HOST is empty. Fill in the SMTP block in backend/.env.")

        send_mail(
            subject="TalentBridge SMTP test",
            message=(
                "This is a test message from TalentBridge.\n\n"
                f"Backend: {settings.EMAIL_BACKEND}\n"
                f"From: {settings.DEFAULT_FROM_EMAIL}\n"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient],
            fail_silently=False,
        )
        self.stdout.write(self.style.SUCCESS(f"Test email sent to {recipient}."))
