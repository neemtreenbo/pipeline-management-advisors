# Pipeline Feature Plan — Proposal Upload

## Objective
Allow users to upload and manage proposal documents directly within a deal in the Pipeline.  
This ensures proposals are tied to the sales opportunity and can be referenced during the decision process.

---

# 1. Feature Overview

Users should be able to:

- Upload proposal files (PDF, images)
- View uploaded proposals
- Replace or upload new versions
- Access proposals directly from the deal
- See proposal indicators in Pipeline Kanban and Table views

The feature should remain lightweight and integrated into the workflow of the sales pipeline.

---

# 2. Where the Proposal Lives

Proposal uploads belong to the **Deal**.

Structure:

Deal  
├ Client  
├ Notes  
├ Tasks  
├ Activities  
└ Proposal Files

Users upload proposals from the **Deal Detail View**.

---

# 3. Supported File Types

Allowed uploads:

- PDF
- PNG
- JPG

Recommended max size:
10MB

---

# 4. Behavior Across Pipeline Stages

Pipeline Stages:

Prospect  
Contacted  
Engaged  
Meeting Scheduled  
Presented  
Decision Pending  
Closed (Won)  
Closed (Lost)

Proposal upload behavior:

### Before Presented
Uploading proposals is allowed but optional.

These may be:
- draft proposals
- preliminary illustrations

### Presented Stage
Proposal is expected.

If the stage is moved to **Presented** and no proposal exists:

System warning:
"Proposal not uploaded yet."

Optional UX improvement:
When a user uploads a proposal, prompt:

"Move deal to Presented stage?"

### Decision Pending
Proposal should already exist.

Users may upload:
- revised proposals
- alternative plan options

---

# 5. Kanban View Behavior

Keep visual design minimal.

Pipeline cards should NOT display filenames.

Instead use simple indicators.

Example:

📎 1  
Meaning: one attachment exists.

Proposal Badge:

"Proposal ✓"

If no proposal exists in Presented stage:

⚠ Proposal missing

---

# 6. Table View Columns

Add these optional columns to the table view.

Proposal  
Shows: Yes / No

Proposal Updated  
Shows latest upload date

Attachments Count

This allows filtering:

Deals in Presented stage with no proposal.

---

# 7. Storage Architecture

Files will be stored in **Supabase Storage**.

Bucket name:

deal-files

Folder pattern:

deal-files/
  deal_id/
    file_id

Example:

deal-files/2a8f9c/proposal_v1.pdf

---

# 8. Database Design

Create a new table:

deal_attachments

Fields:

id (uuid, primary key)

deal_id (uuid)
Reference to deals table.

file_type (text)
Examples:
proposal
supporting_document

file_name (text)

storage_path (text)
Location inside Supabase Storage.

mime_type (text)

size_bytes (integer)

uploaded_by (uuid)
User who uploaded the file.

created_at (timestamp)

Optional future fields:

is_latest (boolean)

version_number (integer)

---

# 9. Versioning Strategy

When a new proposal is uploaded:

Do NOT overwrite the old file.

Instead:

Insert a new record.

Latest proposal = newest created_at.

This provides automatic version history.

---

# 10. Permissions

Access follows Deal permissions.

If user can view deal:
- Can view proposal

If user can edit deal:
- Can upload proposal
- Can delete proposal

Supabase Storage should be configured as:

Private bucket.

Files served using **signed URLs**.

---

# 11. Activity Logging

When a proposal is uploaded:

Create an activity record.

Example activity:

Type:
proposal_uploaded

Message:
"Proposal uploaded"

This activity should appear in the deal timeline.

---

# 12. Future Improvements (Phase 2)

Possible enhancements:

Proposal version history UI

Preview inside the app

Multiple proposal comparison

Auto reminder:

"Follow up after proposal presentation"

AI analysis of proposal content

---

# MVP Scope

Minimum functionality required for v1:

1. Upload proposal file
2. Store file in Supabase Storage
3. Save metadata in deal_attachments
4. Show attachment indicator in Pipeline
5. Allow viewing/downloading the file
6. Keep old versions when uploading new files