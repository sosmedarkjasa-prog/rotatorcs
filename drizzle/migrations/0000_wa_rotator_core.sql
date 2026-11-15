
-- ===== Roles =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.assign_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assign_first_admin() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created_assign_admin
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.assign_first_admin();

-- ===== Tables =====
CREATE TABLE public.cs_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot smallint NOT NULL UNIQUE CHECK (slot IN (1, 2)),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '' CHECK (phone = '' OR phone ~ '^62[0-9]{8,13}$'),
  previous_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  banned_at timestamptz,
  portal_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  last_actor text NOT NULL DEFAULT 'Sistem',
  last_action text NOT NULL DEFAULT 'init',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rotator_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  backup_name text NOT NULL DEFAULT 'Owner (Cadangan)',
  backup_phone text NOT NULL DEFAULT '' CHECK (backup_phone = '' OR backup_phone ~ '^62[0-9]{8,13}$'),
  last_slot smallint NOT NULL DEFAULT 2,
  webhook_secret text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  message_template text NOT NULL DEFAULT 'Halo kak mau promo ini ya [{ref}]' CHECK (char_length(message_template) BETWEEN 1 AND 500),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ref_code text NOT NULL UNIQUE,
  routed_to text NOT NULL CHECK (routed_to IN ('cs1', 'cs2', 'backup')),
  agent_id uuid REFERENCES public.cs_agents(id) ON DELETE SET NULL,
  phone text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clicks_created_at_idx ON public.clicks (created_at DESC);
CREATE INDEX clicks_campaign_idx ON public.clicks (campaign_id);

CREATE TABLE public.chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_id uuid REFERENCES public.clicks(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ref_code text,
  routed_to text,
  sender text,
  message text NOT NULL,
  source text NOT NULL DEFAULT 'macrodroid',
  is_duplicate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chats_created_at_idx ON public.chats (created_at DESC);
CREATE INDEX chats_click_idx ON public.chats (click_id);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.cs_agents(id) ON DELETE SET NULL,
  agent_label text NOT NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  old_phone text,
  new_phone text,
  old_status text,
  new_status text,
  rotation_before text,
  rotation_after text,
  actor text NOT NULL DEFAULT 'Sistem',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs (created_at DESC);

-- ===== Grants =====
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_agents, public.rotator_settings, public.campaigns, public.clicks, public.chats, public.activity_logs TO authenticated;
GRANT ALL ON public.cs_agents, public.rotator_settings, public.campaigns, public.clicks, public.chats, public.activity_logs TO service_role;

-- ===== RLS =====
ALTER TABLE public.cs_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage agents" ON public.cs_agents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage settings" ON public.rotator_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read clicks" ON public.clicks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage chats" ON public.chats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read activity" ON public.activity_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== Rotation helpers =====
CREATE OR REPLACE FUNCTION public.rotation_label(a1 boolean, a2 boolean, b boolean)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN a1 AND a2 THEN 'CS 1 + CS 2 (50:50)'
    WHEN a1 THEN 'CS 1 (100%)'
    WHEN a2 THEN 'CS 2 (100%)'
    WHEN b THEN 'Backup Owner (100%)'
    ELSE 'Tidak ada nomor aktif'
  END
$$;

CREATE OR REPLACE FUNCTION public.cs_agents_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'banned' AND OLD.status IS DISTINCT FROM 'banned' THEN
    NEW.banned_at := now();
  ELSIF NEW.status = 'active' THEN
    NEW.banned_at := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER cs_agents_before_update BEFORE UPDATE ON public.cs_agents
FOR EACH ROW EXECUTE FUNCTION public.cs_agents_before_update();

CREATE OR REPLACE FUNCTION public.log_agent_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  other_ok boolean;
  backup_ok boolean;
  old_ok boolean := (OLD.status = 'active' AND OLD.phone <> '');
  new_ok boolean := (NEW.status = 'active' AND NEW.phone <> '');
  r_before text;
  r_after text;
  descr text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status AND OLD.phone IS NOT DISTINCT FROM NEW.phone THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.cs_agents WHERE id <> NEW.id AND status = 'active' AND phone <> '') INTO other_ok;
  SELECT COALESCE((SELECT backup_phone <> '' FROM public.rotator_settings WHERE id = 1), false) INTO backup_ok;
  IF NEW.slot = 1 THEN
    r_before := public.rotation_label(old_ok, other_ok, backup_ok);
    r_after := public.rotation_label(new_ok, other_ok, backup_ok);
  ELSE
    r_before := public.rotation_label(other_ok, old_ok, backup_ok);
    r_after := public.rotation_label(other_ok, new_ok, backup_ok);
  END IF;
  descr := CASE NEW.last_action
    WHEN 'report_banned' THEN NEW.name || ' melaporkan nomor BANNED'
    WHEN 'undo' THEN NEW.name || ' membatalkan laporan banned (salah pencet)'
    WHEN 'reuse_old' THEN NEW.name || ' aktif kembali memakai nomor lama'
    WHEN 'change_number' THEN NEW.name || ' mengganti nomor dan aktif kembali'
    WHEN 'admin_override' THEN 'Admin mengubah ' || NEW.name ||
      CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN ' menjadi ' || upper(NEW.status) ELSE '' END ||
      CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN ' (nomor diperbarui)' ELSE '' END
    ELSE 'Perubahan data ' || NEW.name
  END;
  INSERT INTO public.activity_logs (agent_id, agent_label, event_type, description, old_phone, new_phone,
    old_status, new_status, rotation_before, rotation_after, actor)
  VALUES (NEW.id, NEW.name, NEW.last_action, descr, OLD.phone, NEW.phone,
    OLD.status, NEW.status, r_before, r_after, NEW.last_actor);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_agent_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER cs_agents_log_change AFTER UPDATE ON public.cs_agents
FOR EACH ROW EXECUTE FUNCTION public.log_agent_change();

CREATE OR REPLACE FUNCTION public.log_backup_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a1 boolean;
  a2 boolean;
BEGIN
  NEW.updated_at := now();
  IF OLD.backup_phone IS NOT DISTINCT FROM NEW.backup_phone THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.cs_agents WHERE slot = 1 AND status = 'active' AND phone <> '') INTO a1;
  SELECT EXISTS (SELECT 1 FROM public.cs_agents WHERE slot = 2 AND status = 'active' AND phone <> '') INTO a2;
  INSERT INTO public.activity_logs (agent_label, event_type, description, old_phone, new_phone,
    rotation_before, rotation_after, actor)
  VALUES ('Backup Owner', 'backup_update', 'Admin memperbarui nomor cadangan darurat', OLD.backup_phone, NEW.backup_phone,
    public.rotation_label(a1, a2, OLD.backup_phone <> ''), public.rotation_label(a1, a2, NEW.backup_phone <> ''), 'Admin');
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.log_backup_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER rotator_settings_log_change BEFORE UPDATE ON public.rotator_settings
FOR EACH ROW EXECUTE FUNCTION public.log_backup_change();

-- ===== Rotator =====
CREATE OR REPLACE FUNCTION public.route_click(p_slug text, p_user_agent text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_campaign_id uuid;
  v_template text;
  v_last smallint;
  v_backup text;
  v_a1_id uuid; v_a1_phone text;
  v_a2_id uuid; v_a2_phone text;
  v_chosen int;
  v_phone text;
  v_agent uuid;
  v_routed text;
  v_code text;
  v_msg text;
BEGIN
  SELECT id, message_template INTO v_campaign_id, v_template
  FROM public.campaigns WHERE slug = lower(p_slug) AND is_active;
  IF v_campaign_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'campaign_not_found');
  END IF;

  SELECT last_slot, backup_phone INTO v_last, v_backup FROM public.rotator_settings WHERE id = 1 FOR UPDATE;
  SELECT id, phone INTO v_a1_id, v_a1_phone FROM public.cs_agents WHERE slot = 1 AND status = 'active' AND phone <> '';
  SELECT id, phone INTO v_a2_id, v_a2_phone FROM public.cs_agents WHERE slot = 2 AND status = 'active' AND phone <> '';

  IF v_a1_id IS NOT NULL AND v_a2_id IS NOT NULL THEN
    v_chosen := CASE WHEN v_last = 1 THEN 2 ELSE 1 END;
  ELSIF v_a1_id IS NOT NULL THEN
    v_chosen := 1;
  ELSIF v_a2_id IS NOT NULL THEN
    v_chosen := 2;
  ELSE
    v_chosen := 0;
  END IF;

  IF v_chosen = 1 THEN
    v_phone := v_a1_phone; v_agent := v_a1_id; v_routed := 'cs1';
  ELSIF v_chosen = 2 THEN
    v_phone := v_a2_phone; v_agent := v_a2_id; v_routed := 'cs2';
  ELSE
    IF COALESCE(v_backup, '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'no_active_number');
    END IF;
    v_phone := v_backup; v_routed := 'backup';
  END IF;

  IF v_chosen > 0 THEN
    UPDATE public.rotator_settings SET last_slot = v_chosen WHERE id = 1;
  END IF;

  LOOP
    v_code := 'REF-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.clicks WHERE ref_code = v_code);
  END LOOP;

  v_msg := replace(v_template, '{ref}', v_code);
  IF position(v_code IN v_msg) = 0 THEN
    v_msg := v_msg || ' [' || v_code || ']';
  END IF;

  INSERT INTO public.clicks (campaign_id, ref_code, routed_to, agent_id, phone, user_agent)
  VALUES (v_campaign_id, v_code, v_routed, v_agent, v_phone, left(p_user_agent, 300));

  RETURN jsonb_build_object('ok', true, 'phone', v_phone, 'message', v_msg, 'ref_code', v_code, 'routed_to', v_routed);
END $$;
REVOKE ALL ON FUNCTION public.route_click(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.route_click(text, text) TO service_role;

-- ===== MacroDroid chat recorder =====
CREATE OR REPLACE FUNCTION public.record_chat(p_secret text, p_message text, p_sender text, p_source text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_secret text;
  v_ref text;
  v_click uuid;
  v_campaign uuid;
  v_routed text;
  v_dup boolean := false;
BEGIN
  SELECT webhook_secret INTO v_secret FROM public.rotator_settings WHERE id = 1;
  IF p_secret IS NULL OR v_secret IS NULL OR p_secret <> v_secret THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  v_ref := (regexp_match(upper(COALESCE(p_message, '')), 'REF-[A-Z0-9]{4,8}'))[1];
  IF v_ref IS NOT NULL THEN
    SELECT id, campaign_id, routed_to INTO v_click, v_campaign, v_routed FROM public.clicks WHERE ref_code = v_ref;
  END IF;
  IF v_click IS NOT NULL THEN
    v_dup := EXISTS (SELECT 1 FROM public.chats WHERE click_id = v_click);
  END IF;
  INSERT INTO public.chats (click_id, campaign_id, ref_code, routed_to, sender, message, source, is_duplicate)
  VALUES (v_click, v_campaign, v_ref, v_routed, left(p_sender, 100), left(p_message, 2000), COALESCE(p_source, 'macrodroid'), v_dup);
  RETURN jsonb_build_object('ok', true, 'ref_code', v_ref, 'matched', v_click IS NOT NULL, 'routed_to', v_routed, 'duplicate', v_dup);
END $$;
REVOKE ALL ON FUNCTION public.record_chat(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_chat(text, text, text, text) TO service_role;

-- ===== CS portal (token-gated) =====
CREATE OR REPLACE FUNCTION public.cs_portal_get(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  a public.cs_agents;
  a1 boolean; a2 boolean; b boolean;
BEGIN
  SELECT * INTO a FROM public.cs_agents WHERE portal_token = p_token;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Link portal tidak valid';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.cs_agents WHERE slot = 1 AND status = 'active' AND phone <> '') INTO a1;
  SELECT EXISTS (SELECT 1 FROM public.cs_agents WHERE slot = 2 AND status = 'active' AND phone <> '') INTO a2;
  SELECT COALESCE((SELECT backup_phone <> '' FROM public.rotator_settings WHERE id = 1), false) INTO b;
  RETURN jsonb_build_object(
    'id', a.id, 'slot', a.slot, 'name', a.name, 'phone', a.phone, 'previous_phone', a.previous_phone,
    'status', a.status, 'banned_at', a.banned_at, 'updated_at', a.updated_at,
    'rotation', public.rotation_label(a1, a2, b)
  );
END $$;

CREATE OR REPLACE FUNCTION public.cs_report_banned(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cs_agents SET status = 'banned', last_actor = name, last_action = 'report_banned'
  WHERE portal_token = p_token AND status = 'active';
  RETURN public.cs_portal_get(p_token);
END $$;

CREATE OR REPLACE FUNCTION public.cs_undo_report(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cs_agents SET status = 'active', last_actor = name, last_action = 'undo'
  WHERE portal_token = p_token AND status = 'banned';
  RETURN public.cs_portal_get(p_token);
END $$;

CREATE OR REPLACE FUNCTION public.cs_reuse_old(p_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_phone text;
BEGIN
  SELECT phone INTO v_phone FROM public.cs_agents WHERE portal_token = p_token;
  IF COALESCE(v_phone, '') = '' THEN
    RAISE EXCEPTION 'Belum ada nomor lama. Gunakan Ganti Nomor.';
  END IF;
  UPDATE public.cs_agents SET status = 'active', last_actor = name, last_action = 'reuse_old'
  WHERE portal_token = p_token AND status = 'banned';
  RETURN public.cs_portal_get(p_token);
END $$;

CREATE OR REPLACE FUNCTION public.cs_change_number(p_token uuid, p_phone text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.cs_agents;
BEGIN
  IF p_phone IS NULL OR p_phone !~ '^62[0-9]{8,13}$' THEN
    RAISE EXCEPTION 'Format nomor tidak valid. Gunakan format +62 8xx.';
  END IF;
  SELECT * INTO a FROM public.cs_agents WHERE portal_token = p_token;
  IF a.id IS NULL THEN
    RAISE EXCEPTION 'Link portal tidak valid';
  END IF;
  IF EXISTS (SELECT 1 FROM public.cs_agents WHERE id <> a.id AND phone = p_phone) THEN
    RAISE EXCEPTION 'Nomor ini sudah dipakai CS lain';
  END IF;
  IF a.phone = p_phone THEN
    RAISE EXCEPTION 'Nomor sama dengan nomor sekarang. Gunakan Pakai Nomor Lama Lagi.';
  END IF;
  UPDATE public.cs_agents
  SET previous_phone = NULLIF(phone, ''), phone = p_phone, status = 'active', last_actor = name, last_action = 'change_number'
  WHERE id = a.id;
  RETURN public.cs_portal_get(p_token);
END $$;

REVOKE ALL ON FUNCTION public.cs_portal_get(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_report_banned(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_undo_report(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_reuse_old(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cs_change_number(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cs_portal_get(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_report_banned(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_undo_report(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_reuse_old(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cs_change_number(uuid, text) TO anon, authenticated, service_role;

-- ===== Stats (admin, RLS applies) =====
CREATE OR REPLACE FUNCTION public.dashboard_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'total_clicks', (SELECT count(*) FROM public.clicks),
    'clicks_cs1', (SELECT count(*) FROM public.clicks WHERE routed_to = 'cs1'),
    'clicks_cs2', (SELECT count(*) FROM public.clicks WHERE routed_to = 'cs2'),
    'clicks_backup', (SELECT count(*) FROM public.clicks WHERE routed_to = 'backup'),
    'clicks_today', (SELECT count(*) FROM public.clicks WHERE created_at >= date_trunc('day', now())),
    'total_chats', (SELECT count(*) FROM public.chats WHERE NOT is_duplicate),
    'matched_chats', (SELECT count(DISTINCT click_id) FROM public.chats WHERE click_id IS NOT NULL),
    'unmatched_chats', (SELECT count(*) FROM public.chats WHERE click_id IS NULL),
    'chats_today', (SELECT count(*) FROM public.chats WHERE NOT is_duplicate AND created_at >= date_trunc('day', now()))
  )
$$;

CREATE OR REPLACE FUNCTION public.campaign_stats()
RETURNS TABLE (campaign_id uuid, clicks bigint, chats bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT c.id,
    (SELECT count(*) FROM public.clicks k WHERE k.campaign_id = c.id),
    (SELECT count(DISTINCT ch.click_id) FROM public.chats ch WHERE ch.campaign_id = c.id AND ch.click_id IS NOT NULL)
  FROM public.campaigns c
$$;
REVOKE ALL ON FUNCTION public.dashboard_stats() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.campaign_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.campaign_stats() TO authenticated, service_role;

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.cs_agents, public.rotator_settings, public.campaigns, public.clicks, public.chats, public.activity_logs;

-- ===== Seed =====
INSERT INTO public.rotator_settings (id) VALUES (1);
INSERT INTO public.cs_agents (slot, name) VALUES (1, 'CS 1'), (2, 'CS 2');
INSERT INTO public.campaigns (name, slug, message_template) VALUES ('Promo Utama', 'promo', 'Halo kak mau promo ini ya [{ref}]');
