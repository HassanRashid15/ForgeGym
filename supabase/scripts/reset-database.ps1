# Database Reset Script for Windows
# WARNING: This will DELETE ALL DATA including auth users

Write-Host "⚠️  WARNING: This will delete ALL data from your Supabase database!" -ForegroundColor Red
Write-Host "This includes all users, profiles, gym data, etc."
Write-Host ""
$confirm = Read-Host "Are you sure you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Aborted."
    exit 1
}

Write-Host ""
Write-Host "Step 1: Manual deletion of auth users"
Write-Host "Please delete all users from your Supabase dashboard:"
Write-Host "1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/users"
Write-Host "2. Select all users and delete them"
Write-Host "3. Press Enter when done..."
Read-Host

Write-Host ""
Write-Host "Step 2: Running database cleanup..."
Write-Host "Please run the SQL script 'cleanup_and_seed_superadmin.sql' in Supabase SQL Editor"
Write-Host "1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql/new"
Write-Host "2. Copy and paste the contents of cleanup_and_seed_superadmin.sql"
Write-Host "3. Run the SQL"
Write-Host "4. Press Enter when done..."
Read-Host

Write-Host ""
Write-Host "Step 3: Database reset complete."
Write-Host ""
Write-Host "To create a superadmin:"
Write-Host "1. Sign up through the application at /register"
Write-Host "2. Use the email you want for superadmin"
Write-Host "3. After signup, run this SQL in Supabase SQL Editor:"
Write-Host ""
Write-Host "UPDATE profiles SET is_super_admin = true, admin_approved = true, is_verified = true WHERE email = 'your-email@example.com';"
Write-Host ""
Write-Host "INSERT INTO user_roles (user_id, role)"
Write-Host "SELECT user_id, 'admin' FROM profiles WHERE email = 'your-email@example.com';"
Write-Host ""
Write-Host "Replace 'your-email@example.com' with the email you used to sign up."
