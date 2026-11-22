import ast, pathlib, unittest, re
r=pathlib.Path(__file__).resolve().parent / 'backend'
class StaticSecurityTests(unittest.TestCase):
 def tree(self,p): return ast.parse((r/p).read_text())
 def getclass(self,p,n): return next(x for x in self.tree(p).body if isinstance(x,ast.ClassDef) and x.name==n)
 def permission(self,p,n):
  c=self.getclass(p,n)
  return next((ast.unparse(node.value) for node in c.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='permission_classes' for t in node.targets)),None)
 def test_deny_by_default(self):
  t=(r/'config/settings.py').read_text(); self.assertIn('"rest_framework.permissions.IsAuthenticated"',t)
  self.assertNotIn('"rest_framework.permissions.AllowAny"',t)
 def test_anonymous_registration_and_catalog(self):
  for p,n in [('accounts/views.py','RegisterView'),('accounts/views.py','LoginView'),('accounts/views.py','CsrfView'),('accounts/views.py','TalentDirectoryView'),('catalog/views.py','SDGListView'),('freelance/views.py','FreelanceOptionsView')]:
   self.assertEqual(self.permission(p,n),'[AllowAny]',(p,n))
 def test_private_saved_opps(self):
  self.assertEqual(self.permission('opportunities/views.py','MySavedOpportunitiesView'),'[IsAuthenticated, IsTalent]')
 def test_mutations_require_auth(self):
  for p,cs in [('community/views.py',['CommunityPostDetailView']),('freelance/views.py',['FreelanceProjectDetailView']),('opportunities/views.py',['OpportunityDetailView','TalentProjectDetailView'])]:
   for n in cs:self.assertEqual(self.permission(p,n),'[IsAuthenticatedOrReadOnly]')
 def test_admin_suspension(self):
  s=(r/'accounts/views.py').read_text();self.assertIn('user.is_active = updates["status"] == "active"',s);self.assertIn('with transaction.atomic():',s)
 def test_csrf(self):
  s=(r/'core/authentication.py').read_text();self.assertIn('self.enforce_csrf(request)',s)
 def test_user_public_serializer_no_private_email(self):
  c=self.getclass('accounts/serializers.py','PublicUserSerializer'); s=ast.unparse(c); self.assertNotIn('"email"',s);self.assertNotIn('"password"',s)
 def test_security_middleware(self):
  s=(r/'core/middleware.py').read_text();self.assertIn('getattr(user, "status", "active") != "active"',s)
 def test_no_unprotected_view_default(self):
  for p in r.glob('*/views.py'):
   for node in self.tree(p.relative_to(r)).body:
    if not isinstance(node,ast.ClassDef) or not node.name.endswith('View'): continue
    has_perm=self.permission(p.relative_to(r),node.name)
    self.assertIsNotNone(has_perm,(p.parent.name,node.name))
if __name__=='__main__': unittest.main(verbosity=2)
