# Firestore Security Specification and TDD Scenarios

## Data Invariants
1. **User Identity Invariant**: A user's profile ID (`userId`) must exactly match their authenticated UID (`request.auth.uid`). No identity spoofing is allowed.
2. **Nickname Uniqueness Invariant**: Setting a nickname requires creating a unique mapping document under `nicknames/{nickname_lowercase}` where `uid` matches the holder's `request.auth.uid`.
3. **Admin Privilege Invariant**: Users cannot self-escalate their `role` to 'Admin' or 'Moderator'. All registration default roles must be checked.
4. **Message Authenticity**: Messages in chat rooms must set `senderId` to the current `request.auth.uid`.
5. **Private Message Confidentiality**: Only specified participants of a conversation (`participants` array) can read/write the conversation document or any messages within its subcollection.
6. **Channel Governance**: Only the channel owner can update or delete a public or PIN-protected room.

---

## The "Dirty Dozen" Malicious Payloads

### 1. Privilege Escalation (User Registration)
Attempting to register with 'Admin' role directly:
```json
// Path: /users/attacker123
{
  "uid": "attacker123",
  "nickname": "bad_admin",
  "email": "attacker@spam.com",
  "role": "Admin",
  "joinedAt": "server_timestamp",
  "status": "online"
}
```
*Expected: PERMISSION_DENIED*

### 2. User Profile Identity Spoofing
Attempting to create/modify a profile for another user:
```json
// Path: /users/victim123
{
  "uid": "victim123",
  "nickname": "victim",
  "email": "victim@gmail.com",
  "role": "Member",
  "joinedAt": "server_timestamp",
  "status": "online"
}
```
*Expected: PERMISSION_DENIED*

### 3. Nickname Theft
Attempting to claim a nickname owned by someone else in the mapping table:
```json
// Path: /nicknames/coolguy
{
  "uid": "attacker123",
  "nickname": "coolguy"
}
```
*Expected: PERMISSION_DENIED (if resource already exists in DB)*

### 4. Direct Message Eavesdropping
An unauthorized user trying to read private conversation headers they are not a participant in:
```json
// Path: /conversations/bob123_alice456
// User: charlie789
// Query: get()
```
*Expected: PERMISSION_DENIED*

### 5. Private Message Injector
An unauthorized user trying to append a message in a private chat between others:
```json
// Path: /conversations/bob123_alice456/messages/msg789
// User: charlie789
{
  "id": "msg789",
  "text": "Hehe eavesdropping!",
  "senderId": "charlie789",
  "senderNickname": "charlie",
  "createdAt": "server_timestamp"
}
```
*Expected: PERMISSION_DENIED*

### 6. Message Author Spoofing
Attempting to send a message under another user's identity:
```json
// Path: /rooms/general/messages/msg999
{
  "id": "msg999",
  "text": "I am a bad actor",
  "senderId": "victim123",
  "senderNickname": "victim",
  "createdAt": "server_timestamp"
}
```
*Expected: PERMISSION_DENIED*

### 7. Unauthorized Message Alteration
Attempting to edit another user's message in a chatroom:
```json
// Path: /rooms/general/messages/msg_from_victim
// User: attacker123
{
  "text": "Modifying your message content!"
}
```
*Expected: PERMISSION_DENIED*

### 8. Unauthorized Channel Takeover
An unprivileged user trying to update room name/description/PIN:
```json
// Path: /rooms/general
// User: attacker123 (general ownerId is survivor456)
{
  "name": "Hacked Channel",
  "description": "Owned by attacker",
  "pin": "1234"
}
```
*Expected: PERMISSION_DENIED*

### 9. Unauthorized Channel Deletion
A non-owner attempting to delete a channel:
```json
// Path: /rooms/general
// User: attacker123 (general owner id is survivor456)
// Action: DELETE
```
*Expected: PERMISSION_DENIED*

### 10. Invalid ID Injection (Resource Poisoning)
Injecting a massive and malformed identifier string for a user profile or channel:
```json
// Path: /users/VERYLONGIDEXCEEDINGLIMITS_1234567890_1234567890_1234567890...
```
*Expected: PERMISSION_DENIED*

### 11. System Message Spoofing
Attempting to post an arbitrary system banner message inside a channel without privileges:
```json
// Path: /rooms/general/messages/sys_msg_1
{
  "id": "sys_msg_1",
  "text": "System Alert: Admin rights granted to attacker123",
  "senderId": "system",
  "senderNickname": "System",
  "isSystem": true,
  "type": "system",
  "createdAt": "server_timestamp"
}
```
*Expected: PERMISSION_DENIED*

### 12. Bypassing Status Field Rules
An attacker trying to change another user's status:
```json
// Path: /users/victim123
// User: attacker123
{
  "status": "away"
}
```
*Expected: PERMISSION_DENIED*

---

## Test Verification Stub
Due to client-side sandboxing, standard testing is executed directly through client-side query rejection assertions. We verify that our Firestore Rules protect every collection listed under the 12 scenarios.
