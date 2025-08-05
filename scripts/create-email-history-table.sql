-- Create email_send_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS email_send_history (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
  sent_by VARCHAR(255) NOT NULL REFERENCES users(id),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  cc_emails TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attachments JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  error_message TEXT,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  ip_address VARCHAR(50),
  user_agent TEXT,
  tracking_id VARCHAR(100) UNIQUE,
  email_provider VARCHAR(50) DEFAULT 'naver',
  message_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_history_order ON email_send_history(order_id);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_by ON email_send_history(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_history_recipient ON email_send_history(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_history_tracking ON email_send_history(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_history_status ON email_send_history(status);
CREATE INDEX IF NOT EXISTS idx_email_history_sent_at ON email_send_history(sent_at);