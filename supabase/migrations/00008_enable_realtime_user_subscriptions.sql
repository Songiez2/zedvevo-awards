
-- Enable Realtime publication for user_subscriptions so the frontend
-- subscription listener fires immediately when the webhook activates a plan.
ALTER PUBLICATION supabase_realtime ADD TABLE user_subscriptions;
