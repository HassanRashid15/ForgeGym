#!/bin/bash

# Database Reset Script
# WARNING: This will DELETE ALL DATA including auth users

echo "⚠️  WARNING: This will delete ALL data from your Supabase database!"
echo "This includes all users, profiles, gym data, etc."
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Deleting all auth users..."
echo "Note: This requires your Supabase project reference ID"
read -p "Enter your Supabase project ref (from dashboard): " project_ref

# Get list of all users
supabase auth users list --project-ref $project-ref > users.txt

# Delete each user
while IFS= read -r line; do
    if [[ $line =~ UUID:[[:space:]]([a-f0-9-]+) ]]; then
        user_id="${BASH_REMATCH[1]}"
        echo "Deleting user: $user_id"
        supabase auth users delete $user_id --project-ref $project_ref
    fi
done < users.txt

rm users.txt

echo ""
echo "Step 2: Running database cleanup script..."
supabase db reset --project-ref $project_ref

echo ""
echo "Step 3: Database reset complete."
echo ""
echo "To create a superadmin:"
echo "1. Sign up through the application at /register"
echo "2. Use the email you want for superadmin"
echo "3. After signup, run this SQL in Supabase SQL Editor:"
echo ""
echo "UPDATE profiles SET is_super_admin = true, admin_approved = true, is_verified = true WHERE email = 'your-email@example.com';"
echo ""
echo "INSERT INTO user_roles (user_id, role)"
echo "SELECT user_id, 'admin' FROM profiles WHERE email = 'your-email@example.com';"
echo ""
echo "Replace 'your-email@example.com' with the email you used to sign up."
