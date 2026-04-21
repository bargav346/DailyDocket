
CREATE TABLE public.email_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  task_id UUID,
  recipient_email TEXT NOT NULL,
  minutes_before INTEGER,
  status TEXT NOT NULL,
  error_message TEXT,
  message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email logs"
ON public.email_send_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email logs"
ON public.email_send_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_email_send_log_task_id ON public.email_send_log(task_id);
CREATE INDEX idx_email_send_log_user_id ON public.email_send_log(user_id);
