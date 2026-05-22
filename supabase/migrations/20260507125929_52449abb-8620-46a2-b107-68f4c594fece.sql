
-- files_management: owner-scoped CRUD
CREATE POLICY "Users can view own files"
  ON public.files_management FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON public.files_management FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON public.files_management FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.files_management FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- storage_devices: owner-scoped CRUD
CREATE POLICY "Users can view own storage devices"
  ON public.storage_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage devices"
  ON public.storage_devices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage devices"
  ON public.storage_devices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage devices"
  ON public.storage_devices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
