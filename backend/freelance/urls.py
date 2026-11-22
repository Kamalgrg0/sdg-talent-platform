from django.urls import path

from . import views

urlpatterns = [
    path("", views.FreelanceProjectListCreateView.as_view(), name="freelance-projects"),
    path("options/", views.FreelanceOptionsView.as_view(), name="freelance-options"),
    path("proposals/mine/", views.MyProposalsView.as_view(), name="my-proposals"),
    path("proposals/<int:pk>/status/", views.ProposalStatusUpdateView.as_view(), name="proposal-status"),
    path("proposals/<int:pk>/withdraw/", views.ProposalWithdrawView.as_view(), name="proposal-withdraw"),
    path("<int:pk>/", views.FreelanceProjectDetailView.as_view(), name="freelance-project-detail"),
    path("<int:pk>/proposals/", views.ProjectProposalsView.as_view(), name="freelance-project-proposals"),
    path("<int:pk>/proposals/submit/", views.ProposalSubmitView.as_view(), name="freelance-proposal-submit"),
]
