-- Onboarding calls get their own Google Meet link (made by the company Google
-- account, set to record and take notes automatically).
alter table onboarding_calls add column if not exists meet_link text;
alter table onboarding_calls add column if not exists meet_space text;
notify pgrst, 'reload schema';
