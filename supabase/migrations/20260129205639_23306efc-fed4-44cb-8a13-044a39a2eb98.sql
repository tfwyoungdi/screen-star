-- Allow cinema admins to delete email campaigns in their organization
CREATE POLICY "Cinema admins can delete email campaigns" 
ON public.customer_email_campaigns 
FOR DELETE 
USING (is_cinema_admin(auth.uid(), organization_id));