from django.db import migrations

EXACT_REWRITES = {
    "/dashboard/organization": "/dashboard/employer",
    "/manage-applicants": "/dashboard/employer",
}

PREFIX_REWRITES = (
    ("/manage-applicants/", "/dashboard/manage-applicants/"),
)


def normalize(link):
    value = (link or "").strip()
    value = EXACT_REWRITES.get(value, value)
    for old, new in PREFIX_REWRITES:
        if value.startswith(old):
            return f"{new}{value[len(old):]}"
    return value


def forwards(apps, schema_editor):
    Notification = apps.get_model("notifications", "Notification")
    for notification in Notification.objects.exclude(link=""):
        fixed = normalize(notification.link)
        if fixed and fixed != notification.link:
            notification.link = fixed
            notification.save(update_fields=["link"])


class Migration(migrations.Migration):
    dependencies = [("notifications", "0001_initial")]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
