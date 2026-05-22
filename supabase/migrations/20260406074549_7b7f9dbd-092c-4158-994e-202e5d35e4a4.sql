
-- Drop the existing select policy that restricts to own bookings
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

-- Create new policy allowing all authenticated users to view all bookings
CREATE POLICY "Authenticated users can view all bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (true);
