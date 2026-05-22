-- Allow anonymous users to read freelancer profiles
CREATE POLICY "Anon can view profiles"
  ON public.freelancer_profiles FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read bookings (for calendar visibility)
CREATE POLICY "Anon can view bookings"
  ON public.bookings FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read market posts
CREATE POLICY "Anon can view posts"
  ON public.market_posts FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read market post dates
CREATE POLICY "Anon can view post dates"
  ON public.market_post_dates FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read market applications
CREATE POLICY "Anon can view applications"
  ON public.market_applications FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read market comments
CREATE POLICY "Anon can view comments"
  ON public.market_comments FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read market assignments
CREATE POLICY "Anon can view assignments"
  ON public.market_assignments FOR SELECT
  TO anon
  USING (true);