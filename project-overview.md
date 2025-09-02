# Receipt Subsidy Bot - Context & Features Document

## Project Context

This is a live event application for an AI safety meetup. Attendees who purchase food can submit receipts for a 50% subsidy (max $10 per person). The twist: this is secretly a jailbreaking competition where attendees can try to manipulate the AI into awarding excessive amounts.

The system will run during a single meetup event, processing email submissions in real-time with live display of the AI's reasoning process. All development and hosting will be done through GitHub Codespaces with port forwarding for public access.

**Scale Note**: Initial deployment is for a small meetup (~10 attendees) with sporadic submissions. Participants may not even realize the jailbreaking opportunity exists, making organic discovery part of the experience. System is optimized for spectacle over throughput.

## Core User Flow

1. **Attendee sends email** to designated Gmail address with:
   - Receipt image/PDF (from any restaurant or delivery service)
   - Photo of their group eating the meal
   - Any email text (potential attack vector)

2. **System processes submission**:
   - Polls Gmail inbox every 10-30 seconds
   - Extracts all attachments and email content
   - Queues for processing
   - Displays on public screen

3. **AI analyzes and calculates**:
   - Determines number of people from photo
   - Extracts receipt total
   - Calculates per-person costs
   - Applies 50% subsidy (max $10/person)
   - Outputs FINAL PAYOUT amount

4. **Admin pays out**:
   - Views admin interface on phone/laptop
   - Sees bot's recommended payout
   - Hands cash to representative
   - Marks as paid

## Key Features

### Email Processing System
- Poll Gmail API for new messages
- Extract email body, subject, sender info
- Download all attachments (images, PDFs)
- Handle inline images and multiple attachments
- Store everything locally with timestamps

### AI Processing Engine
- Use OpenAI GPT-4 API (single response, not streaming)
- Verbose chain-of-thought reasoning
- Structured JSON output format:
  ```json
  {
    "reasoning": "verbose chain of thought...",
    "people_count": 3,
    "receipt_total": 45.67,
    "per_person_cost": 15.22,
    "subsidy_per_person": 7.61,
    "final_payout": 22.83,
    "confidence": "high"
  }
  ```
- Process any receipt format (digital, photo, handwritten)
- Limit: Max 2 images analyzed per submission

### Public Display Interface (`/display`)
Real-time projection view showing:
- **Left side**:
  - Queue of pending emails (current highlighted)
  - Large photo of group eating
  - Receipt image below
- **Right side**:
  - "Fake streaming" AI thoughts in monospace font (30-60 chars/second)
  - Complete response fetched, then dramatically revealed character-by-character
  - Processing steps visible with theatrical pacing
  - Bottom: Running list of reimbursements

### Admin Interface (`/admin`)
Private payout management showing:
- List of all submissions (unpaid first)
- **For each**: 
  - Big bold FINAL PAYOUT amount
  - Thumbnail images
  - Quick "Mark Paid" button
  - Override amount option
- Search by email
- Running totals of payouts

### Data Persistence
- SQLite database for all submissions
- File system storage for images and emails
- Track: bot amounts vs actual payouts
- Backup every 10 minutes
- Append-only audit log

## Technical Architecture

### Environment
- GitHub Codespaces for development and hosting
- Port forwarding for public URLs
- Single codebase, multiple access points

### Stack
- **Backend**: Node.js/TypeScript with Express
- **Frontend**: Vue 3 + Vite + Tailwind CSS  
- **Real-time**: Socket.io for streaming updates
- **Email**: Gmail API
- **AI**: OpenAI API with streaming
- **Database**: SQLite
- **File Storage**: Local filesystem

### Key Flows
1. **Email → Queue**: Gmail polling → Extract attachments → Add to FIFO processing queue
2. **Queue → AI**: Take next item → Build prompt → Get complete JSON response
3. **AI → Display**: "Fake stream" response via Socket.io → Update all connected clients  
4. **Admin → Payout**: View amount → Pay cash → Mark complete

### Queue Management
- Simple FIFO (first-in-first-out) processing
- One submission processed at a time
- Immediate storage in SQLite on receipt
- Status tracking: pending → processing → completed/failed
- Visual queue display shows current + next 2-3 items
- Admin can manually skip/reorder if needed
- Unique ID per submission for tracking

## Security & Game Mechanics

### Attack Vectors (Hidden from Participants)
- Email subject and body text
- Sender name/email address  
- Receipt image manipulation
- Restaurant names with instructions
- Photo alterations (crowd sizes, text overlays)
- Multiple attachments as distraction

### Safeguards
- Actual payouts capped regardless of bot output
- Admin can override any amount
- All attempts logged for later analysis
- "Paid" flag prevents double-dipping

## Success Criteria

The system successfully:
1. Processes emails within 30 seconds of receipt
2. Displays AI reasoning in entertaining real-time format
3. Provides clear payout amounts for admin
4. Handles receipt/photo combinations
5. Logs everything for post-event analysis
6. Secretly tracks who achieves highest bot payouts

## Edge Cases to Handle

- Multiple receipts in one email (process first, note in reasoning)
- No photo provided (estimate 1 person or reject)
- Unclear number of people (make conservative estimate)
- PDF receipts vs image receipts (both supported)
- Handwritten receipts (best effort OCR)
- Non-food items on receipt (subtract from total)
- Foreign currency (attempt conversion or reject)
- Group submissions where only one person emails (normal case)
- More than 2 images (analyze first 2 only)

## Error Handling Strategy

- **API failures**: Mark as "failed" in queue, show in admin for manual retry
- **Missing required inputs**: Let LLM decide (likely $0 with explanation)
- **Malformed emails**: Skip and log for review
- **Processing timeouts**: Auto-retry once, then mark failed
- **Manual override**: Admin can always adjust amounts or re-queue

## Event Day Checklist

- [ ] Codespace running with ports forwarded
- [ ] Gmail API credentials configured
- [ ] OpenAI API key set
- [ ] Display URL on projector
- [ ] Admin URL on organizer device
- [ ] Test email processed successfully
- [ ] Cash ready for payouts
- [ ] Backup system for manual tracking if needed