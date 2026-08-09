# ADR 003: Use database outbox, Redis, and Dramatiq for durable jobs

Status: accepted

The database records a production run and an outbox message in one transaction. A separate dispatcher sends the message to Dramatiq over Redis. Workers claim leases from the database, making broker redelivery safe and enabling recovery after process loss. The broker is a wake-up mechanism; the database is the source of truth.
