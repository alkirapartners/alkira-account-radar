import pytest
from radar.parser import parse_accounts, ParseError


def test_splits_on_newline():
    parsed, unique = parse_accounts("Acme\nGlobex\nInitech")
    assert parsed == ["Acme", "Globex", "Initech"]
    assert unique == 3


def test_splits_on_comma():
    parsed, _ = parse_accounts("Acme, Globex, Initech")
    assert parsed == ["Acme", "Globex", "Initech"]


def test_splits_on_tab():
    parsed, _ = parse_accounts("Acme\tGlobex\tInitech")
    assert parsed == ["Acme", "Globex", "Initech"]


def test_mixed_delimiters():
    parsed, _ = parse_accounts("Acme, Globex\nInitech\tWayne")
    assert parsed == ["Acme", "Globex", "Initech", "Wayne"]


def test_trims_whitespace():
    parsed, _ = parse_accounts("  Acme   ,  Globex  ")
    assert parsed == ["Acme", "Globex"]


def test_drops_empties():
    parsed, _ = parse_accounts("Acme,, ,\n\nGlobex")
    assert parsed == ["Acme", "Globex"]


def test_dedupes_case_insensitive_preserves_first_casing():
    parsed, unique = parse_accounts("Acme\nacme\nACME\nGlobex")
    assert parsed == ["Acme", "Globex"]
    assert unique == 2


def test_empty_input_raises():
    with pytest.raises(ParseError, match="Add at least one account"):
        parse_accounts("")


def test_only_whitespace_raises():
    with pytest.raises(ParseError, match="Add at least one account"):
        parse_accounts("   \n\t,,")


def test_max_size_enforced():
    raw = "\n".join(f"Co{i}" for i in range(41))
    with pytest.raises(ParseError, match="40 or fewer"):
        parse_accounts(raw, max_size=40)


def test_max_size_after_dedupe_allows_40_unique():
    lines = [f"Co{i}" for i in range(40)] + ["Co0"]
    parsed, unique = parse_accounts("\n".join(lines), max_size=40)
    assert unique == 40
    assert len(parsed) == 40
