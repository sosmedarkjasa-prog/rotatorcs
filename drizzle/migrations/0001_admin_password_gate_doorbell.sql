
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
DROP FUNCTION IF EXISTS public.assign_first_admin();

CREATE OR REPLACE FUNCTION public.ring_rotator_doorbell()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(jsonb_build_object('table', TG_TABLE_NAME), 'changed', 'wa-rotator-doorbell', false);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.ring_rotator_doorbell() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER doorbell_cs_agents AFTER INSERT OR UPDATE OR DELETE ON public.cs_agents FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();
CREATE TRIGGER doorbell_rotator_settings AFTER UPDATE ON public.rotator_settings FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();
CREATE TRIGGER doorbell_campaigns AFTER INSERT OR UPDATE OR DELETE ON public.campaigns FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();
CREATE TRIGGER doorbell_clicks AFTER INSERT ON public.clicks FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();
CREATE TRIGGER doorbell_chats AFTER INSERT OR DELETE ON public.chats FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();
CREATE TRIGGER doorbell_activity_logs AFTER INSERT ON public.activity_logs FOR EACH STATEMENT EXECUTE FUNCTION public.ring_rotator_doorbell();

ALTER PUBLICATION supabase_realtime DROP TABLE public.cs_agents, public.rotator_settings, public.campaigns, public.clicks, public.chats, public.activity_logs;
