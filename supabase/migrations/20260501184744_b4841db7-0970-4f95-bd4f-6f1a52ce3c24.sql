UPDATE public.freelancer_profiles
SET user_id = '753ec85d-3af0-42d0-9a21-69a6f6cfb996',
    updated_at = now()
WHERE id = '78d50b5d-c604-4746-b0ba-6759e3b6e79c'
  AND lower(coalesce(email,'')) = 'myweddingtalesnepal@gmail.com';