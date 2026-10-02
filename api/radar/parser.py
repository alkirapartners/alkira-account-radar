import re


class ParseError(ValueError):
    pass


_DELIMITERS = re.compile(r"[,\n\r\t]+")
# Each name goes straight into a model prompt; nothing legitimate is longer.
MAX_NAME_LENGTH = 100


def parse_accounts(raw: str, max_size: int = 40) -> tuple[list[str], int]:
    """Parse a textarea blob into a deduped list of account names.

    Splits on comma, newline, or tab; trims whitespace; drops empties;
    dedupes case-insensitively while preserving the first-seen casing.

    Returns (accounts, unique_count). Raises ParseError if the result is
    empty, exceeds max_size, or contains a name over MAX_NAME_LENGTH.
    """
    candidates = (s.strip() for s in _DELIMITERS.split(raw))
    candidates = (s for s in candidates if s)

    seen_lower: set[str] = set()
    accounts: list[str] = []
    for name in candidates:
        key = name.lower()
        if key in seen_lower:
            continue
        seen_lower.add(key)
        accounts.append(name)

    if not accounts:
        raise ParseError("Add at least one account name.")

    if any(len(name) > MAX_NAME_LENGTH for name in accounts):
        raise ParseError(
            f"Each account name must be {MAX_NAME_LENGTH} characters or fewer."
        )

    if len(accounts) > max_size:
        raise ParseError(
            f"Please split into batches of {max_size} or fewer "
            f"(you entered {len(accounts)} unique accounts)."
        )

    return accounts, len(accounts)
