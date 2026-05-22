INSERT INTO public.user_roles (user_id, role)
VALUES ('c9caca28-5d43-457e-ab27-5ca202f112b3', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles
WHERE user_id = '88e8779d-be8d-4f48-914d-661a8b5d0d17'
  AND role = 'admin';