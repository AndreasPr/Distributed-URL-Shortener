charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

def encode_base62(num: int) -> str:
    base = len(charset)
    encoded = []
    
    while num > 0:
        remainder = num % base
        encoded.append(charset[remainder])
        num //= base
        
    return ''.join(reversed(encoded))