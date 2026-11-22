"""Create an administrator account from the command line.

Administrators can never be created through public registration, so the first
administrator must be created from the command line.
"""
import getpass

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import AccountStatus, Role, User


class Command(BaseCommand):
    help = "Create an administrator account (CLI only)."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--name", required=True)
        parser.add_argument("--password", help="Prompted for when omitted.")

    @transaction.atomic
    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        name = options["name"].strip()
        password = options.get("password")
        if User.objects.filter(email=email).exists():
            raise CommandError("An account with that email already exists.")
        if not password:
            password = getpass.getpass("Password: ")
            confirm = getpass.getpass("Confirm password: ")
            if password != confirm:
                raise CommandError("Passwords do not match.")
        if len(password) < 8:
            raise CommandError("The password must be at least 8 characters.")
        user = User.objects.create_superuser(email=email, name=name, password=password)
        user.status = AccountStatus.ACTIVE
        user.save(update_fields=["status"])
        self.stdout.write(self.style.SUCCESS(f"Administrator created: {user.email}"))
