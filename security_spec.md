# Security Specification: Multi-User Civil Engineering Projects & Role-Based Access Control

## 1. Data Invariants
- Each project must be strictly owned by an authenticated, verified user identified by `ownerId == request.auth.uid`.
- Non-admin users can ONLY list, read, create, update, and delete their own projects (`resource.data.ownerId == request.auth.uid`).
- Administrator (`engrkalilinux@gmail.com` or users in `/admins/{adminId}`) possesses full supervisory control: can list, inspect, edit, and delete any project across the system to support team management.
- User profile documents (`/users/{userId}`) can only be created by the authenticated owner (`incoming().uid == request.auth.uid`), and users cannot elevate their own role to 'admin' without administrative verification.
- Document IDs must conform to alphanumeric formatting (`^[a-zA-Z0-9_\\-]+$`) with length `<= 128`.
- Timestamps and immutability invariants: `id`, `ownerId`, and `createdAt` cannot be altered upon update.

## 2. The Dirty Dozen Threat Payloads
1. **Unauthenticated Read**: Anonymous user attempts to read `/projects/proj_123`.
2. **Cross-User Project Read**: User B attempts to read User A's project.
3. **Cross-User Project Listing**: User B queries all projects without `ownerId == User B`.
4. **Owner Spoofing on Create**: User B submits a new project with `ownerId: "user_a"`.
5. **Project Hijack on Update**: User B attempts to mutate User A's project.
6. **Owner Mutation on Update**: User A attempts to change `ownerId` to someone else.
7. **Creation Timestamp Tampering**: Modifying `createdAt` during update.
8. **Malicious ID Injection**: Project created with 2000-character malicious path ID.
9. **Self-Promotion to Admin**: User B creates a profile `/users/user_b` with `role: "admin"`.
10. **Role Escalation on Profile Update**: User B updates their profile to grant themselves `role: "admin"`.
11. **Cross-User Profile Hijack**: User B modifies `/users/user_a`.
12. **Unverified Email Write**: User with `email_verified: false` attempts to write project data.

All 12 threat vectors are strictly denied by `firestore.rules`.
