# L30 — Customer communication templates

**Rules**

- Replace bracketed placeholders; remove lines that do not apply.
- **Do not** name internal vendors, database systems, or signing secrets.
- **Do not** promise a specific fix time unless an incident commander approves.
- **Do not** confirm fraud accusations toward the customer.

---

## 1. Outage acknowledgement

> Thank you for contacting us. We’re aware that some customers may be unable to complete [top-ups / purchases] right now. Our team is actively working to restore normal service.  
> We’re sorry for the inconvenience and will update you as soon as we have more information.

---

## 2. Payment pending investigation

> Thank you for your message and for sharing your details. We’re looking into your payment now.  
> We’ll follow up once we’ve confirmed the status on our side. If you have an order or receipt reference, please keep it available — we may ask you to confirm the last few characters only for security purposes.

---

## 3. Fulfillment delayed

> Thanks for your patience. We can see your payment, and we’re working to complete your [top-up / order].  
> Delays can sometimes happen when mobile networks are busy. We’ll update you as soon as the delivery is completed or if we need any additional information from you.

---

## 4. Refund / dispute received

> We’ve received your request regarding your recent payment.  
> Refunds and bank disputes are reviewed carefully and may take several business days depending on your card issuer. We’ll share updates when we have meaningful progress. We’re not able to speed up the card network’s timeline.

---

## 5. Provider / partner outage (generic)

> We’re seeing delays affecting some mobile top-ups. This appears to be related to external network conditions outside our direct control.  
> Your request remains in our queue and we’ll process it as soon as service levels return to normal. Thank you for bearing with us.

---

## 6. Account access issue

> We’re sorry you’re having trouble signing in.  
> Please check your spam folder for a verification message and try requesting a new code once. If it still doesn’t arrive, reply with [the email address you use for your account — partial masking per policy] and approximate time of the last attempt, and we’ll help investigate.

---

## 7. Resolved case

> We’ve completed our review. [Choose one:]  
> - Your [top-up / order] has now been delivered successfully.  
> - We weren’t able to find a successful payment matching the details provided; if you still see a charge, please send a screenshot of your bank or card statement showing the charge description (you may mask other transactions).  
> - We’ve processed a refund according to our policies; please allow your bank a few days to show the credit.  
> If anything still looks wrong, reply to this thread and reference [ticket id].

---

## 8. Request for more information

> To help us investigate quickly, could you please send:  
> - The approximate date and time  
> - The phone number or account involved (you may show only the last few digits)  
> - Any reference shown in your receipt or confirmation email  
> We’ll keep your information confidential and use it only to resolve this case.

---

## Localization / tone

- Keep sentences short; avoid jargon (“webhook”, “database”, “Redis”).
- If legal/compliance requires a different script for disputes, replace §4 with counsel-approved text.
