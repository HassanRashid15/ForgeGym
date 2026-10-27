-- Drop old tables if they exist
DROP TABLE IF EXISTS ai_disabled_models CASCADE;
DROP TABLE IF EXISTS ai_speed_test_results CASCADE;

-- Create single table for AI models management
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  is_disabled BOOLEAN DEFAULT FALSE,
  response_time INTEGER,
  status TEXT CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, provider, model)
);

-- Enable RLS
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own ai models" ON ai_models;
DROP POLICY IF EXISTS "Users can insert own ai models" ON ai_models;
DROP POLICY IF EXISTS "Users can update own ai models" ON ai_models;
DROP POLICY IF EXISTS "Users can delete own ai models" ON ai_models;

-- Create policy: Users can only see their own models
CREATE POLICY "Users can view own ai models"
  ON ai_models FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own models
CREATE POLICY "Users can insert own ai models"
  ON ai_models FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can update their own models
CREATE POLICY "Users can update own ai models"
  ON ai_models FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policy: Users can delete their own models
CREATE POLICY "Users can delete own ai models"
  ON ai_models FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_models_user_id ON ai_models(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_model ON ai_models(provider, model);
CREATE INDEX IF NOT EXISTS idx_ai_models_disabled ON ai_models(is_disabled) WHERE is_disabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_models_last_tested ON ai_models(last_tested_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_ai_models_updated_at ON ai_models;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ai_models_updated_at
  BEFORE UPDATE ON ai_models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
