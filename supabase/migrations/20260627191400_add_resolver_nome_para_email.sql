CREATE OR REPLACE FUNCTION public.resolver_nome_para_email(p_nome text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text;
BEGIN
  -- Try exact match case-insensitive first
  SELECT email INTO v_email
  FROM public.app_profiles
  WHERE LOWER(nome) = LOWER(p_nome)
  LIMIT 1;

  -- If not found, try partial match
  IF v_email IS NULL THEN
    SELECT email INTO v_email
    FROM public.app_profiles
    WHERE nome ILIKE '%' || p_nome || '%'
    LIMIT 1;
  END IF;
  
  RETURN v_email;
END;
$$;
