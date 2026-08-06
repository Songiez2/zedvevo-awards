-- Super Admin Setup for ZedVevo
-- Run this AFTER the main schema.sql

-- Note: This will be executed manually by the first super admin user
-- The super admin email: topkuchalo@gmail.com

-- To set up the super admin:
-- 1. First, register the user through the application at /register
-- 2. Then, run this SQL with the user's ID to promote them to super_admin

-- Example (replace USER_ID with actual UUID from auth.users):
-- UPDATE profiles SET role = 'super_admin' WHERE id = 'USER_ID';

-- You can find the user ID by running:
-- SELECT id, email FROM auth.users WHERE email = 'topkuchalo@gmail.com';

-- Lipila Configuration Table
CREATE TABLE IF NOT EXISTS lipila_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    api_key TEXT NOT NULL,
    webhook_secret TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default Lipila config (placeholder - update with real values)
INSERT INTO lipila_config (merchant_id, service_id, api_key)
VALUES ('YOUR_MERCHANT_ID', 'YOUR_SERVICE_ID', 'YOUR_API_KEY')
ON CONFLICT DO NOTHING;

-- Function to promote user to super_admin
CREATE OR REPLACE FUNCTION promote_to_super_admin(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Get the user by email
    SELECT id INTO user_record FROM auth.users WHERE email = user_email;
    
    IF user_record.id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', user_email;
        RETURN FALSE;
    END IF;
    
    -- Check if there's already a super admin
    IF EXISTS (SELECT 1 FROM profiles WHERE role = 'super_admin') THEN
        RAISE EXCEPTION 'A super admin already exists';
        RETURN FALSE;
    END IF;
    
    -- Promote to super admin
    UPDATE profiles SET role = 'super_admin' WHERE id = user_record.id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin (includes super_admin and admin)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role IN ('super_admin', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = user_id 
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set first user as super_admin
CREATE OR REPLACE FUNCTION set_first_user_as_super_admin()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is the first user (no super_admin exists), make them super_admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE role = 'super_admin') THEN
        NEW.role := 'super_admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger should be on profiles table but only when inserting via auth
-- Since auth.users and profiles are separate, we'll handle this in the application logic
