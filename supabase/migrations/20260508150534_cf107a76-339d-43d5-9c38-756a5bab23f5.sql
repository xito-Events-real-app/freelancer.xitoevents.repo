
-- Allow staff with finance role to verify the company owner's PIN
CREATE OR REPLACE FUNCTION public.has_agency_finance_pin(_agency_user_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target uuid := COALESCE(_agency_user_id, auth.uid());
BEGIN
  IF _target IS NULL THEN RETURN false; END IF;
  -- If a non-self target is passed, gate via finance access
  IF _target <> auth.uid() AND NOT public.can_access_company(_target, 'finance') THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.agency_finance_pins WHERE user_id = _target);
END;
$$;

DROP FUNCTION IF EXISTS public.verify_agency_finance_pin(text);
CREATE OR REPLACE FUNCTION public.verify_agency_finance_pin(_pin text, _agency_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _target uuid := COALESCE(_agency_user_id, auth.uid());
  _record public.agency_finance_pins%ROWTYPE;
  _new_attempts integer;
  _token text;
  _expires_at timestamp with time zone := now() + interval '10 minutes';
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;

  -- Authorize: caller must be the target (legacy owner-self) OR have finance access
  IF _target <> _uid AND NOT public.can_access_company(_target, 'finance') THEN
    RAISE EXCEPTION 'Access denied for finance';
  END IF;

  SELECT * INTO _record FROM public.agency_finance_pins WHERE user_id = _target;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'needsSetup', true, 'message', 'Finance PIN has not been set');
  END IF;

  IF _record.locked_until IS NOT NULL AND _record.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'lockedUntil', _record.locked_until, 'message', 'Finance editing is temporarily locked');
  END IF;

  IF _record.pin_hash = extensions.crypt(_pin, _record.pin_hash) THEN
    _token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Session keyed to caller so each staff has their own timer
    DELETE FROM public.agency_finance_sessions
    WHERE user_id = _uid OR expires_at <= now();

    INSERT INTO public.agency_finance_sessions (user_id, token_hash, expires_at)
    VALUES (_uid, extensions.crypt(_token, extensions.gen_salt('bf'::text, 12)), _expires_at);

    UPDATE public.agency_finance_pins
    SET failed_attempts = 0, locked_until = NULL, updated_at = now()
    WHERE user_id = _target;

    RETURN jsonb_build_object('success', true, 'sessionToken', _token, 'expiresAt', _expires_at);
  END IF;

  _new_attempts := _record.failed_attempts + 1;

  UPDATE public.agency_finance_pins
  SET failed_attempts = _new_attempts,
      locked_until = CASE WHEN _new_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
  WHERE user_id = _target;

  RETURN jsonb_build_object(
    'success', false,
    'locked', _new_attempts >= 5,
    'attemptsRemaining', GREATEST(5 - _new_attempts, 0),
    'message', CASE WHEN _new_attempts >= 5 THEN 'Too many wrong attempts. Try again later.' ELSE 'Wrong PIN' END
  );
END;
$$;
