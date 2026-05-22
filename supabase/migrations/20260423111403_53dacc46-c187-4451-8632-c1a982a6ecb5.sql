CREATE OR REPLACE FUNCTION public.set_agency_finance_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agency_finance_pins WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Finance PIN already exists';
  END IF;

  INSERT INTO public.agency_finance_pins (user_id, pin_hash)
  VALUES (_uid, extensions.crypt(_pin, extensions.gen_salt('bf'::text, 12)));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_agency_finance_pin(_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _record public.agency_finance_pins%ROWTYPE;
  _new_attempts integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _pin IS NULL OR _pin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 6 digits';
  END IF;

  SELECT * INTO _record
  FROM public.agency_finance_pins
  WHERE user_id = _uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'needsSetup', true, 'message', 'Finance PIN has not been set');
  END IF;

  IF _record.locked_until IS NOT NULL AND _record.locked_until > now() THEN
    RETURN jsonb_build_object('success', false, 'locked', true, 'lockedUntil', _record.locked_until, 'message', 'Finance editing is temporarily locked');
  END IF;

  IF _record.pin_hash = extensions.crypt(_pin, _record.pin_hash) THEN
    UPDATE public.agency_finance_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = now()
    WHERE user_id = _uid;

    RETURN jsonb_build_object('success', true);
  END IF;

  _new_attempts := _record.failed_attempts + 1;

  UPDATE public.agency_finance_pins
  SET failed_attempts = _new_attempts,
      locked_until = CASE WHEN _new_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END,
      updated_at = now()
  WHERE user_id = _uid;

  RETURN jsonb_build_object(
    'success', false,
    'locked', _new_attempts >= 5,
    'attemptsRemaining', GREATEST(5 - _new_attempts, 0),
    'message', CASE WHEN _new_attempts >= 5 THEN 'Too many wrong attempts. Try again later.' ELSE 'Wrong PIN' END
  );
END;
$$;