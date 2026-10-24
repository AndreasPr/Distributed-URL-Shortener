# Offline response fixtures

`claude_message.json` is a representative, sanitized Messages response constructed
from the official API contract, not captured from a live request. It contains no
credentials or real user data. Tests replay it through a mocked requests transport;
no Anthropic API call is made. This is contract coverage, not live-service coverage.
