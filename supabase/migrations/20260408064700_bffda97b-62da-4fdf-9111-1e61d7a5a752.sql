
DROP POLICY "System can insert feed notifications" ON public.feed_notifications;
CREATE POLICY "Users can insert feed notifications from self"
  ON public.feed_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = from_user_id);
