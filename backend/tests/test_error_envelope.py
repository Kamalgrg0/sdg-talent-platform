"""Regression tests for the DRF error envelope, runnable without installed Django.

The tests stub the three DRF imports so they validate formatting logic offline.
Run with: python -m unittest discover -s backend/tests -v
"""
import importlib.util
import pathlib
import sys
import types
import unittest
from unittest.mock import patch


class FakeResponse:
    def __init__(self, data, status=400):
        self.data = data
        self.status_code = status


class FakeErrorDetail(str):
    def __repr__(self):
        return f"ErrorDetail(string={str.__repr__(self)}, code='invalid')"


class ErrorEnvelopeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        rest_framework = types.ModuleType("rest_framework")
        rest_framework.status = types.SimpleNamespace(HTTP_500_INTERNAL_SERVER_ERROR=500)
        response_module = types.ModuleType("rest_framework.response")
        response_module.Response = FakeResponse
        views_module = types.ModuleType("rest_framework.views")
        views_module.exception_handler = lambda exc, context: exc
        with patch.dict(sys.modules, {
            "rest_framework": rest_framework,
            "rest_framework.response": response_module,
            "rest_framework.views": views_module,
        }):
            path = pathlib.Path(__file__).resolve().parents[1] / "core" / "exceptions.py"
            spec = importlib.util.spec_from_file_location("test_subject_error_envelope", path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        cls.handler = staticmethod(module.api_exception_handler)

    def run_envelope(self, data):
        return self.handler(FakeResponse(data), {})

    def test_login_error_is_readable(self):
        response = self.run_envelope({"detail": [FakeErrorDetail("Incorrect email or password.")]})
        self.assertEqual(response.data, {"detail": "Incorrect email or password.", "errors": None})
        self.assertNotIn("ErrorDetail", str(response.data))

    def test_simple_detail_and_permission(self):
        response = self.run_envelope({"detail": FakeErrorDetail("Authentication credentials were not provided.")})
        self.assertEqual(response.data["detail"], "Authentication credentials were not provided.")
        self.assertIsNone(response.data["errors"])

    def test_registration_errors_are_plain_nested_strings(self):
        response = self.run_envelope({
            "non_field_errors": [FakeErrorDetail("This password is too common."), FakeErrorDetail("This password is entirely numeric.")],
            "profile": {"skills": [FakeErrorDetail("Select a valid skill.")]},
        })
        self.assertEqual(response.data["detail"], "Please correct the highlighted fields.")
        self.assertEqual(response.data["errors"]["non_field_errors"], ["This password is too common.", "This password is entirely numeric."])
        self.assertEqual(response.data["errors"]["profile"]["skills"], ["Select a valid skill."])
        self.assertNotIn("ErrorDetail", str(response.data))

    def test_mixed_detail_and_field_errors(self):
        response = self.run_envelope({"detail": [FakeErrorDetail("Invalid request.")], "email": [FakeErrorDetail("Email already exists.")]})
        self.assertEqual(response.data["detail"], "Invalid request.")
        self.assertEqual(response.data["errors"], {"email": ["Email already exists."]})

    def test_top_level_list_error(self):
        response = self.run_envelope([FakeErrorDetail("One or more invalid values."), FakeErrorDetail("Try again.")])
        self.assertEqual(response.data["detail"], "One or more invalid values.")

    def test_unknown_exception_does_not_expose_secret(self):
        response = self.handler(None, {})
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["detail"], "Something went wrong. Please try again.")


if __name__ == "__main__":
    unittest.main()
