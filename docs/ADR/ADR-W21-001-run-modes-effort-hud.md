# ADR-W21-001 — Run modes, effort and usage HUD

- Status: accepted
- Wave: W21

Run mode and effort are conversation settings persisted in SQLite and validated at the shared IPC boundary. Plan mode adds an explicit planning instruction and never enables tools. Effort maps only to bounded generation parameters; it never silently changes model identity. Provider capabilities explicitly declare `thinking`; unsupported providers do not receive a thinking budget and the HUD states that limitation. Usage is emitted through the Zod-validated chat event contract without secrets.

Council dispatch metadata remains out-of-band: the immutable compiler packet is passed unchanged to every adapter.
