from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("register/", views.RegisterView.as_view(), name="register"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("profile/", views.MyProfileView.as_view(), name="my-profile"),
    path("organization/", views.MyOrganizationView.as_view(), name="my-organization"),
    path("organizations/<int:pk>/", views.OrganizationDetailView.as_view(), name="organization-detail"),
    path("talent/", views.TalentDirectoryView.as_view(), name="talent-directory"),
    path("talent/options/", views.TalentOptionsView.as_view(), name="talent-options"),
    path("talent/<int:pk>/", views.PublicProfileView.as_view(), name="public-profile"),
    path("invitations/", views.InvitationListCreateView.as_view(), name="invitations"),
    path("admin/users/", views.AdminUserListView.as_view(), name="admin-users"),
    path("admin/users/<int:pk>/", views.AdminUserDetailView.as_view(), name="admin-user-detail"),
]
