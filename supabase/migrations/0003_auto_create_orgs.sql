-- Update the new user trigger to also create a default organization for them.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_org_id uuid;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Insert default org
  INSERT INTO public.organizations (name, created_by)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || ' Workspace', NEW.id)
  RETURNING id INTO v_org_id;
  
  -- Update profile to have this as default.
  UPDATE public.profiles SET default_organization_id = v_org_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$;
