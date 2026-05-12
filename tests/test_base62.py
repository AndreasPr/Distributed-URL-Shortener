from app.utils.base62 import encode_base62


def test_encode_base62_zero_returns_empty_string():
    assert encode_base62(0) == ""


def test_encode_base62_small_numbers():
    assert encode_base62(1) == "b"
    assert encode_base62(61) == "9"
    assert encode_base62(62) == "ba"


def test_encode_base62_larger_number():
    assert encode_base62(125) == "cb"
