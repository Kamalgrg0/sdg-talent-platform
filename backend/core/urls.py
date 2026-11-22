from django.urls import path

from . import views

urlpatterns = [
    path("home/", views.HomeView.as_view(), name="home"),
    path("dashboard/", views.DashboardView.as_view(), name="dashboard"),
    path("admin/stats/", views.AdminStatsView.as_view(), name="admin-stats"),
    path("admin/organizations/", views.AdminOrganizationListView.as_view(), name="admin-organizations"),
    path(
        "admin/organizations/<int:pk>/",
        views.AdminOrganizationDetailView.as_view(),
        name="admin-organization-detail",
    ),
    path("admin/applications/", views.AdminApplicationListView.as_view(), name="admin-applications"),
    path("admin/talent/", views.AdminTalentListView.as_view(), name="admin-talent"),
]
