from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils.text import slugify


class Role(models.TextChoices):
    JOB_SEEKER = "job_seeker", "Job seeker"
    FREELANCER = "freelancer", "Freelancer"
    EMPLOYER = "employer", "Employer"
    ORGANIZATION = "organization", "Organization"
    ADMIN = "admin", "Administrator"


class AccountStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, name, password, role, **extra):
        if not email:
            raise ValueError("An email address is required.")
        if not name:
            raise ValueError("A name is required.")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, name=name, role=role, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, name, password=None, role=Role.JOB_SEEKER, **extra):
        extra.setdefault("status", AccountStatus.ACTIVE)
        return self._create_user(email, name, password, role, **extra)

    def create_superuser(self, email, name, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("status", AccountStatus.ACTIVE)
        return self._create_user(email, name, password, Role.ADMIN, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=190, unique=True)
    # Stored in the existing ``users.password_hash`` column.
    password = models.CharField(max_length=255, db_column="password_hash")
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.JOB_SEEKER)
    status = models.CharField(max_length=12, choices=AccountStatus.choices, default=AccountStatus.ACTIVE)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["role", "status"]),
            models.Index(fields=["name"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)

    def check_password(self, raw_password):
        """Verify Django hashes and standalone bcrypt hashes."""
        if super().check_password(raw_password):
            return True
        if self.password and self.password.startswith(("$2y$", "$2a$", "$2b$")):
            try:
                import bcrypt

                return bcrypt.checkpw(raw_password.encode("utf-8"), self.password.encode("utf-8"))
            except (ValueError, TypeError):
                return False
        return False

    @property
    def is_admin(self):
        return self.role == Role.ADMIN

    @property
    def is_employer_side(self):
        return self.role in {Role.EMPLOYER, Role.ORGANIZATION, Role.ADMIN}

    @property
    def is_talent(self):
        return self.role in {Role.JOB_SEEKER, Role.FREELANCER}

    @property
    def is_suspended(self):
        return self.status == AccountStatus.SUSPENDED


class Availability(models.TextChoices):
    HOURS_2_5 = "2-5", "2-5 hours / week"
    HOURS_5_10 = "5-10", "5-10 hours / week"
    HOURS_10_20 = "10-20", "10-20 hours / week"
    HOURS_20_PLUS = "20+", "20+ hours / week"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    phone = models.CharField(max_length=30, blank=True)
    location = models.CharField(max_length=120)
    professional_title = models.CharField(max_length=150)
    bio = models.TextField()
    education = models.TextField(blank=True)
    experience = models.TextField(blank=True)
    availability = models.CharField(max_length=8, choices=Availability.choices)
    portfolio_url = models.URLField(max_length=255, blank=True)
    linkedin_url = models.URLField(max_length=255, blank=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "profiles"
        indexes = [
            models.Index(fields=["location"]),
            models.Index(fields=["availability"]),
            models.Index(fields=["is_public"]),
        ]

    def __str__(self):
        return f"{self.user.name} — {self.professional_title}"


class Organization(models.Model):
    owner_user = models.OneToOneField(User, on_delete=models.PROTECT, related_name="organization")
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True)
    description = models.TextField(blank=True)
    website = models.URLField(max_length=255, blank=True)
    location = models.CharField(max_length=120, blank=True)
    contact_email = models.EmailField(max_length=190, blank=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "organizations"
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["is_verified"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)[:170] or "organization"
            slug = base
            counter = 2
            while Organization.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)
