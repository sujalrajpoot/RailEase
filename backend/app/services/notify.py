import logging

log = logging.getLogger("notify")

def send_confirmation(email, phone, pnr, details):
    # swap for SES/SendGrid + Twilio/MSG91 in production
    log.warning("EMAIL to %s | SMS to %s | PNR %s | %s", email, phone, pnr, details)
