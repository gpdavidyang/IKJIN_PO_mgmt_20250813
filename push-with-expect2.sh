#!/usr/bin/expect -f

set timeout 300

spawn npm run db:push

# Wait for the interactive prompt
expect {
    "Is approval_step_status enum created or renamed from another enum?" {
        # Select the first option (create enum) by pressing Enter
        send "\r"
        exp_continue
    }
    "Do you want to push these changes to database?" {
        send "y\r"
        exp_continue
    }
    "Changes applied" {
        puts "\nDatabase schema updated successfully!"
    }
    "No changes detected" {
        puts "\nNo schema changes needed."
    }
    eof {
        puts "\nScript completed."
    }
    timeout {
        puts "\nOperation timed out after 5 minutes."
        exit 1
    }
}

wait