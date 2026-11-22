from django.urls import path

from . import views

urlpatterns = [
    path("", views.OpportunityListCreateView.as_view(), name="opportunity-list"),
    path("options/", views.OpportunityOptionsView.as_view(), name="opportunity-options"),
    path("applications/mine/", views.MyApplicationsView.as_view(), name="my-applications"),
    path("saved/mine/", views.MySavedOpportunitiesView.as_view(), name="my-saved-opportunities"),
    path("talent-projects/", views.TalentProjectListCreateView.as_view(), name="talent-projects"),
    path("talent-projects/<int:pk>/", views.TalentProjectDetailView.as_view(), name="talent-project-detail"),
    path("invitations/", views.InvitationCreateView.as_view(), name="invitation-create"),
    path("invitations/<int:pk>/status/", views.InvitationStatusView.as_view(), name="invitation-status"),
    path("<int:pk>/", views.OpportunityDetailView.as_view(), name="opportunity-detail"),
    path("<int:pk>/apply/", views.ApplyView.as_view(), name="opportunity-apply"),
    path("<int:pk>/save/", views.SaveToggleView.as_view(), name="opportunity-save"),
    path("<int:pk>/applicants/", views.OpportunityApplicantsView.as_view(), name="opportunity-applicants"),
    path("applications/<int:pk>/status/", views.ApplicationStatusUpdateView.as_view(), name="application-status"),
    path("applications/<int:pk>/respond/", views.ApplicationOfferResponseView.as_view(), name="application-offer-response"),
]
