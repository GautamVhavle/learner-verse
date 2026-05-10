"""Tests for the verification request flow.

Uses SINGLE_USER_MODE (set in conftest.py) so all requests are made
as the default local user (local@learnerverse.dev).
"""

import pytest

from app.core.config import settings

# Patch settings so the local test user is a superadmin
settings.SUPERADMIN_EMAILS = "local@learnerverse.dev"


@pytest.mark.asyncio
async def test_verification_status_no_requests(client):
    """GET /verification/status returns empty state when no requests exist."""
    # Ensure user exists
    await client.get("/api/v1/auth/me")

    response = await client.get("/api/v1/verification/status")
    assert response.status_code == 200

    data = response.json()
    assert data["has_pending"] is False
    assert data["has_approved"] is False
    assert data["status"] is None
    assert data["message"] is None
    assert data["admin_note"] is None
    assert data["request_id"] is None
    assert data["history"] == []


@pytest.mark.asyncio
async def test_submit_verification_request(client):
    """POST /verification/request creates a pending request."""
    await client.get("/api/v1/auth/me")

    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )
    assert response.status_code == 201
    assert response.json()["detail"] == "Verification request submitted successfully."

    # Status should now show pending
    status = await client.get("/api/v1/verification/status")
    assert status.status_code == 200
    data = status.json()
    assert data["has_pending"] is True
    assert data["status"] == "pending"
    assert data["request_id"] is not None
    assert len(data["history"]) == 1
    assert data["history"][0]["status"] == "pending"


@pytest.mark.asyncio
async def test_submit_duplicate_request_rejected(client):
    """Cannot submit a second request while one is pending."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )
    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "Another request while first is pending, should fail."},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_submit_message_too_short(client):
    """Message must be at least 20 characters."""
    await client.get("/api/v1/auth/me")

    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "Short msg"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_withdraw_verification_request(client):
    """DELETE /verification/request withdraws a pending request."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )

    response = await client.delete("/api/v1/verification/request")
    assert response.status_code == 200
    assert response.json()["detail"] == "Verification request withdrawn successfully."

    # Status should show withdrawn
    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert data["has_pending"] is False
    assert data["status"] == "withdrawn"
    assert len(data["history"]) == 1


@pytest.mark.asyncio
async def test_withdraw_no_pending_request(client):
    """Cannot withdraw when no pending request exists."""
    await client.get("/api/v1/auth/me")

    response = await client.delete("/api/v1/verification/request")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_resubmit_after_withdraw(client):
    """Can submit a new request after withdrawing the previous one."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "First application for verification badge."},
    )
    await client.delete("/api/v1/verification/request")

    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "Second application after withdrawing the first one."},
    )
    assert response.status_code == 201

    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert data["has_pending"] is True
    assert len(data["history"]) == 2


@pytest.mark.asyncio
async def test_superadmin_list_verifications(client):
    """GET /superadmin/verifications lists pending requests."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )

    response = await client.get("/api/v1/superadmin/verifications?status=pending")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert data["items"][0]["status"] == "pending"
    assert data["items"][0]["user_email"] == "local@learnerverse.dev"


@pytest.mark.asyncio
async def test_superadmin_approve_verification(client):
    """PUT /superadmin/verifications/{id} approves and sets verified status."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )

    # Get request ID
    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]

    # Approve
    response = await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "approve", "note": "Great profile!"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    # User should now be verified
    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_verified_creator"] is True

    # Status should reflect approval
    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert data["has_approved"] is True
    assert data["status"] == "approved"


@pytest.mark.asyncio
async def test_superadmin_reject_verification(client):
    """PUT /superadmin/verifications/{id} rejects with a note."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )

    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]

    response = await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "reject", "note": "Need more courses first."},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    # Status should show rejected with admin note
    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert data["has_pending"] is False
    assert data["status"] == "rejected"
    assert data["admin_note"] == "Need more courses first."


@pytest.mark.asyncio
async def test_superadmin_reject_requires_note(client):
    """Rejection must include a note."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )

    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]

    response = await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "reject"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_resubmit_after_rejection(client):
    """Can submit a new request after being rejected."""
    await client.get("/api/v1/auth/me")

    # Submit and get rejected
    await client.post(
        "/api/v1/verification/request",
        json={"message": "First application for verification badge."},
    )
    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]

    await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "reject", "note": "Please add more courses."},
    )

    # Resubmit
    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "I have added more courses now, please reconsider."},
    )
    assert response.status_code == 201

    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert data["has_pending"] is True
    assert len(data["history"]) == 2


@pytest.mark.asyncio
async def test_verified_user_cannot_reapply(client):
    """A verified creator cannot submit a new request."""
    await client.get("/api/v1/auth/me")

    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )
    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]

    await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "approve"},
    )

    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "Another request after being approved should fail."},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_superadmin_revoke_verification(client):
    """POST /superadmin/verifications/revoke/{user_id} revokes verified status."""
    me = await client.get("/api/v1/auth/me")
    user_id = me.json()["id"]

    # Submit and approve
    await client.post(
        "/api/v1/verification/request",
        json={"message": "I am an experienced educator with 5 years of teaching."},
    )
    status = await client.get("/api/v1/verification/status")
    request_id = status.json()["request_id"]
    await client.put(
        f"/api/v1/superadmin/verifications/{request_id}",
        json={"action": "approve"},
    )

    # Verify user is verified
    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_verified_creator"] is True

    # Revoke
    response = await client.post(
        f"/api/v1/superadmin/verifications/revoke/{user_id}",
        json={"action": "reject", "note": "Policy violation."},
    )
    assert response.status_code == 200

    # User should no longer be verified
    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_verified_creator"] is False

    # Can reapply after revocation
    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "Reapplying after my verification was revoked."},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_revoke_non_verified_user_fails(client):
    """Cannot revoke a user who is not verified."""
    me = await client.get("/api/v1/auth/me")
    user_id = me.json()["id"]

    response = await client.post(
        f"/api/v1/superadmin/verifications/revoke/{user_id}",
        json={"action": "reject", "note": "Trying to revoke non-verified."},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_full_verification_lifecycle(client):
    """Full lifecycle: submit → reject → resubmit → approve → revoke → reapply."""
    me = await client.get("/api/v1/auth/me")
    user_id = me.json()["id"]

    # 1. Submit
    await client.post(
        "/api/v1/verification/request",
        json={"message": "First attempt at getting verified as a creator."},
    )
    status = await client.get("/api/v1/verification/status")
    req1_id = status.json()["request_id"]

    # 2. Reject
    await client.put(
        f"/api/v1/superadmin/verifications/{req1_id}",
        json={"action": "reject", "note": "Need more content."},
    )

    # 3. Resubmit
    await client.post(
        "/api/v1/verification/request",
        json={"message": "I've added 3 more courses since my last application."},
    )
    status = await client.get("/api/v1/verification/status")
    req2_id = status.json()["request_id"]

    # 4. Approve
    await client.put(
        f"/api/v1/superadmin/verifications/{req2_id}",
        json={"action": "approve", "note": "Looks great now!"},
    )
    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_verified_creator"] is True

    # 5. Revoke
    response = await client.post(
        f"/api/v1/superadmin/verifications/revoke/{user_id}",
        json={"action": "reject", "note": "Content quality declined."},
    )
    assert response.status_code == 200

    me = await client.get("/api/v1/auth/me")
    assert me.json()["is_verified_creator"] is False

    # 6. Reapply
    response = await client.post(
        "/api/v1/verification/request",
        json={"message": "I have improved my content quality significantly."},
    )
    assert response.status_code == 201

    # History should have 3 entries
    status = await client.get("/api/v1/verification/status")
    data = status.json()
    assert len(data["history"]) == 3
    assert data["has_pending"] is True
