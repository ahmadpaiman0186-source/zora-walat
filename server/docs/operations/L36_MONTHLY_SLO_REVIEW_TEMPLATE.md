# L36 — Monthly SLO review template

**Cadence:** End of calendar month (or last business day).  
**Audience:** Eng lead, SRE, Product, Support lead, Finance (as needed).

---

## 1. Reporting period

- **From:** YYYY-MM-DD UTC  
- **To:** YYYY-MM-DD UTC  

---

## 2. SLO status table

| SLO / SLI | Target | Measured | Budget remaining | Status (PASS/FAIL/NOT VERIFIED) |
|-----------|--------|----------|------------------|-------------------------------|
| /health | … | … | … | |
| /ready | … | … | … | |
| Webhook ACK | … | … | … | |
| … | … | … | … | |

*(Copy rows from [`L36_SERVICE_LEVEL_OBJECTIVES.md`](./L36_SERVICE_LEVEL_OBJECTIVES.md).)*

---

## 3. Incident summary

| Incident id | SEV | Duration | SLO impacted | Root cause (short) |
|-------------|-----|----------|--------------|--------------------|
| | | | | |

---

## 4. Error budget consumed

- **Availability budget:** X%  
- **Webhook budget:** Y%  
- **Fulfillment budget:** Z%  

---

## 5. Budget policy decision

- [ ] **Continue** normal operations  
- [ ] **Throttle** soft launch / marketing  
- [ ] **Freeze** feature work (exception list:)  
- [ ] **Exception** approved: (link ticket)

---

## 6. Top risks

1.  
2.  
3.  

---

## 7. Support / security / provider notes

- **Support:**  
- **Security:**  
- **Provider:**  

---

## 8. Launch decision impact

- **Soft launch:** [ widen | hold | narrow ]  
- **Public launch:** [ on track | blocked ] — reason:  

---

## 9. Action items

| Item | Owner | Due |
|------|-------|-----|
| | | |

---

## 10. Signoff

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Product | | |
| SRE | | |

---

## 11. Evidence links

- Dashboard exports (internal, redacted):  
- Incident links:  

---

## 12. Unresolved blockers

-  

---

## References

- [`L36_ERROR_BUDGET_POLICY.md`](./L36_ERROR_BUDGET_POLICY.md)
