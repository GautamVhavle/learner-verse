# ADR 002: Use a separate Remotion render worker

Status: accepted

Future course videos will be compiled by Python domain services and rendered by an isolated Node/TypeScript Remotion worker with FFmpeg tooling. Batch A stores no media and does not implement rendering.
