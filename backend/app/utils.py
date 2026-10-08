import secrets

def generate_pnr(): return "".join(secrets.choice("0123456789") for _ in range(10))

def refund_percent(hours_left):
    return 0.8 if hours_left > 24 else 0.5 if hours_left >= 4 else 0.0
