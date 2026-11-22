"""Load the demo data into the configured database (PostgreSQL).

The seed data lives in ``database/seed.sql``. This command parses the INSERT
statements and maps the SQL column names to the Django models.
"""
import re
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from accounts.models import Organization, Profile, Role, User
from catalog.models import SDG, Skill, SkillCategory, UserSDG, UserSkill
from community.models import Comment, CommunityPost
from freelance.models import FreelanceProject, Proposal, ProjectSkill
from notifications.models import EmailOutbox, Notification
from opportunities.models import (
    Application,
    Invitation,
    Opportunity,
    OpportunitySkill,
    SavedOpportunity,
    TalentProject,
    TalentProjectSkill,
)

INSERT_RE = re.compile(
    r"^INSERT\s+INTO\s+([a-zA-Z_]+)\s*\(([^)]*)\)\s*VALUES\s*(.*)$",
    re.IGNORECASE | re.DOTALL,
)

DELETE_ORDER = [
    EmailOutbox,
    Notification,
    Proposal,
    ProjectSkill,
    FreelanceProject,
    Invitation,
    TalentProjectSkill,
    TalentProject,
    SavedOpportunity,
    Application,
    OpportunitySkill,
    Opportunity,
    UserSDG,
    UserSkill,
    SDG,
    Skill,
    SkillCategory,
    Profile,
    Organization,
    User,
    Comment,
    CommunityPost,
]

TABLE_MODELS = {
    "users": (User, {"password_hash": "password"}),
    "profiles": (Profile, {}),
    "organizations": (Organization, {}),
    "skill_categories": (SkillCategory, {}),
    "skills": (Skill, {}),
    "sdgs": (SDG, {}),
    "user_skills": (UserSkill, {}),
    "user_sdgs": (UserSDG, {}),
    "opportunities": (Opportunity, {"created_by_user_id": "created_by_id"}),
    "opportunity_skills": (OpportunitySkill, {}),
    "applications": (Application, {}),
    "saved_opportunities": (SavedOpportunity, {}),
    "talent_projects": (TalentProject, {"created_by_user_id": "created_by_id"}),
    "talent_project_skills": (TalentProjectSkill, {}),
    "invitations": (Invitation, {"sender_user_id": "sender_id", "talent_user_id": "talent_id"}),
    "freelance_projects": (FreelanceProject, {"client_user_id": "client_id"}),
    "project_skills": (ProjectSkill, {}),
    "proposals": (Proposal, {"freelancer_user_id": "freelancer_id"}),
    "notifications": (Notification, {}),
    "community_posts": (CommunityPost, {}),
    "comments": (Comment, {}),
}

DATE_FIELDS = {"deadline", "event_date", "created_at", "updated_at", "sent_at"}
SEQUENCE_TABLES = [
    "users",
    "profiles",
    "organizations",
    "skill_categories",
    "skills",
    "opportunities",
    "applications",
    "talent_projects",
    "invitations",
    "freelance_projects",
    "proposals",
    "notifications",
    "email_outbox",
    "community_posts",
    "comments",
]


def _split_statements(text):
    """Split SQL on semicolons while ignoring semicolons inside strings."""
    statements = []
    buffer = []
    in_quote = False
    i = 0
    while i < len(text):
        char = text[i]
        if in_quote:
            buffer.append(char)
            if char == "'":
                if i + 1 < len(text) and text[i + 1] == "'":
                    buffer.append(text[i + 1])
                    i += 2
                    continue
                in_quote = False
            i += 1
            continue
        if char == "'":
            in_quote = True
            buffer.append(char)
            i += 1
            continue
        if char == ";":
            statement = "".join(buffer).strip()
            if statement:
                statements.append(statement)
            buffer = []
            i += 1
            continue
        buffer.append(char)
        i += 1
    trailing = "".join(buffer).strip()
    if trailing:
        statements.append(trailing)
    return statements


def parse_seed_statements(text):
    """Return {table: [(columns, rows)]} for every INSERT in the seed file."""
    text = re.sub(r"^\s*--.*$", "", text, flags=re.MULTILINE)
    result = {}
    for statement in _split_statements(text):
        match = INSERT_RE.match(statement.strip())
        if not match:
            continue
        table = match.group(1).lower()
        columns = [part.strip().strip("`") for part in match.group(2).split(",")]
        rows = parse_tuples(match.group(3))
        result.setdefault(table, []).append((columns, rows))
    return result


def parse_tuples(payload):
    rows = []
    i = 0
    length = len(payload)
    while i < length:
        while i < length and payload[i] in " \t\r\n,":
            i += 1
        if i >= length:
            break
        if payload[i] != "(":
            raise CommandError(f"Unexpected token while parsing seed data: {payload[i:i+30]!r}")
        i += 1
        row = []
        while True:
            while i < length and payload[i] in " \t\r\n":
                i += 1
            if i < length and payload[i] == "'":
                i += 1
                buffer = []
                while i < length:
                    char = payload[i]
                    if char == "'":
                        if i + 1 < length and payload[i + 1] == "'":
                            buffer.append("'")
                            i += 2
                            continue
                        i += 1
                        break
                    buffer.append(char)
                    i += 1
                row.append("".join(buffer))
            else:
                start = i
                while i < length and payload[i] not in ",)":
                    i += 1
                token = payload[start:i].strip()
                if token.upper() == "NULL":
                    row.append(None)
                elif re.fullmatch(r"-?\d+", token):
                    row.append(int(token))
                elif re.fullmatch(r"-?\d+\.\d+", token):
                    row.append(Decimal(token))
                elif token == "":
                    row.append("")
                else:
                    row.append(token)
            while i < length and payload[i] in " \t\r\n":
                i += 1
            if i < length and payload[i] == ",":
                i += 1
                continue
            if i < length and payload[i] == ")":
                i += 1
                break
            raise CommandError("Malformed VALUES clause in seed data.")
        rows.append(row)
    return rows


def _parse_datetime(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        parsed = parse_datetime(value)
        if parsed is None:
            parsed = parse_datetime(value.replace(" ", "T"))
        if parsed is None:
            return None
        if settings.USE_TZ and timezone.is_naive(parsed):
            return timezone.make_aware(parsed, timezone.get_default_timezone())
        return parsed
    return value


def _parse_date(value):
    if value in (None, ""):
        return None
    if isinstance(value, str):
        return parse_date(value)
    return value


class Command(BaseCommand):
    help = "Load demo data from database/seed.sql into PostgreSQL."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=str(settings.BASE_DIR.parent / "database" / "seed.sql"),
            help="Path to the seed.sql file.",
        )
        parser.add_argument(
            "--keep",
            action="store_true",
            help="Do not delete existing data before loading the seed.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        path = Path(options["path"])
        if not path.exists():
            raise CommandError(f"Seed file not found: {path}")

        statements = parse_seed_statements(path.read_text(encoding="utf-8"))
        if not statements:
            raise CommandError("No INSERT statements found in the seed file.")

        if not options["keep"]:
            for model in DELETE_ORDER:
                model.objects.all().delete()
            self.stdout.write("Cleared existing demo data.")

        created = 0
        for table, blocks in statements.items():
            if table not in TABLE_MODELS:
                self.stdout.write(self.style.WARNING(f"Skipping unknown table: {table}"))
                continue
            model, mapping = TABLE_MODELS[table]
            for columns, rows in blocks:
                for values in rows:
                    if len(values) != len(columns):
                        raise CommandError(
                            f"Column/value mismatch for {table}: {len(columns)} columns, {len(values)} values."
                        )
                    raw = dict(zip(columns, values))
                    data = {}
                    deferred = {}
                    for column, value in raw.items():
                        field = mapping.get(column, column)
                        if field in {"created_at", "updated_at"}:
                            deferred[field] = _parse_datetime(value)
                            continue
                        if field == "deadline":
                            data[field] = _parse_date(value)
                            continue
                        if field == "event_date" or field == "sent_at":
                            data[field] = _parse_datetime(value)
                            continue
                        data[field] = value
                    if model is User:
                        data["is_active"] = True
                        data["is_staff"] = data.get("role") == Role.ADMIN
                        data["is_superuser"] = data.get("role") == Role.ADMIN
                    # NULL maps to an empty string for non-null text columns.
                    for field_name, value in list(data.items()):
                        if value is None:
                            field = model._meta.get_field(field_name)
                            if not field.null and field.get_internal_type() in {
                                "CharField",
                                "TextField",
                                "URLField",
                                "EmailField",
                                "SlugField",
                            }:
                                data[field_name] = ""
                    obj = model.objects.create(**data)
                    if deferred:
                        model.objects.filter(pk=obj.pk).update(**deferred)
                    created += 1

        self._reset_sequences()
        self.stdout.write(self.style.SUCCESS(f"Loaded {created} rows across {len(statements)} tables."))
        self.stdout.write("Every seeded account uses the demo password: DemoPass123!")

    def _reset_sequences(self):
        if connection.vendor == "mysql":
            with connection.cursor() as cursor:
                for table in SEQUENCE_TABLES:
                    try:
                        # InnoDB resets to MAX(id) + 1 when set to 1.
                        cursor.execute(f"ALTER TABLE `{table}` AUTO_INCREMENT = 1")
                    except Exception:  # noqa: BLE001 - a table without a sequence is harmless
                        pass
            return
        with connection.cursor() as cursor:
            for table in SEQUENCE_TABLES:
                try:
                    cursor.execute(
                        f'SELECT setval(pg_get_serial_sequence(%s, %s), '
                        f'COALESCE((SELECT MAX(id) FROM "{table}"), 1), '
                        f'(SELECT MAX(id) FROM "{table}") IS NOT NULL)',
                        [table, "id"],
                    )
                except Exception:  # noqa: BLE001 - a table without a sequence is harmless
                    pass
