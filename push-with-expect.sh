#!/usr/bin/expect -f

spawn npm run db:push

# Wait for the prompt and select the first option (create enum)
expect "Is approval_step_status enum created or renamed from another enum?"
send "\r"

# Handle any additional prompts that may appear
expect {
    "Do you want to push these changes to database?" {
        send "y\r"
    }
    eof {
        puts "Script completed"
    }
    timeout {
        puts "Timed out"
    }
}

wait