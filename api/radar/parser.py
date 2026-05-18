import re


class ParseError(ValueError):
    pass


_DELIMITERS = re.compile(r"[,\n\r\t]+")


def parse_accounts(raw: str, max_size: int = 40) -> tuple[list[str], int]:
    """Parse a textarea blob into a deduped list of account names.

    Splits on comma, newline, or tab; trims whitespace; drops empties;
    dedupes case-insensitively while preserving the first-seen casing.

    Returns (accounts, unique_count). Raises ParseError if the result is
    empty or exceeds max_size.
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

    if len(accounts) > max_size:
        raise ParseError(
            f"Please split into batches of {max_size} or fewer "
            f"(you entered {len(accounts)} unique accounts)."
        )

    return accounts, len(accounts)
