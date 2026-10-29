# ماتریس ردیابی
شناسه‌های T طرح آزمون‌اند؛ هیچ برنامه یا تست اجرایی در این مرحله ایجاد نشده است. هر ردیف P0 قبل از انتشار باید شاهد اجرا داشته باشد.
| نیازمندی | داستان | معیار | تست پیشنهادی | سطح/وضعیت |
|---|---|---|---|---|
| FR-CUS-001 | US-01 | [AC-CUS-001](acceptance-criteria.md#ac-cus-001) | T-001 | API/داده؛ طراحی‌شده/اجرا نشده |
| FR-CUS-002 | US-01 | [AC-CUS-002](acceptance-criteria.md#ac-cus-002) | T-002 | API/E2E؛ طراحی‌شده/اجرا نشده |
| FR-AUTH-001 | US-02 | [AC-AUTH-001](acceptance-criteria.md#ac-auth-001) | T-003 | امنیت/API؛ طراحی‌شده/اجرا نشده |
| FR-AUTH-002 | US-02 | [AC-AUTH-002](acceptance-criteria.md#ac-auth-002) | T-004 | امنیت/DB؛ طراحی‌شده/اجرا نشده |
| FR-BIZ-001 | US-05 | [AC-BIZ-001](acceptance-criteria.md#ac-biz-001) | T-005 | API/E2E؛ طراحی‌شده/اجرا نشده |
| FR-BIZ-002 | US-05 | [AC-BIZ-002](acceptance-criteria.md#ac-biz-002) | T-006 | دامنه/DB؛ طراحی‌شده/اجرا نشده |
| FR-BIZ-003 | US-05 | [AC-BIZ-003](acceptance-criteria.md#ac-biz-003) | T-007 | مجوز/DB؛ طراحی‌شده/اجرا نشده |
| FR-CAL-001 | US-06 | [AC-CAL-001](acceptance-criteria.md#ac-cal-001) | T-008 | دامنه/DB؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-001 | US-03 | [AC-BOOK-001](acceptance-criteria.md#ac-book-001) | T-009 | دامنه؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-002 | US-03 | [AC-BOOK-002](acceptance-criteria.md#ac-book-002) | T-010 | یکپارچه DB واقعی؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-003 | US-03 | [AC-BOOK-003](acceptance-criteria.md#ac-book-003) | T-011 | API/هم‌زمانی؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-004 | US-03 | [AC-BOOK-004](acceptance-criteria.md#ac-book-004) | T-012 | DB/E2E؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-005 | US-04 | [AC-BOOK-005](acceptance-criteria.md#ac-book-005) | T-013 | مجوز/E2E؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-006 | US-04 | [AC-BOOK-006](acceptance-criteria.md#ac-book-006) | T-014 | دامنه/DB؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-007 | US-04 | [AC-BOOK-007](acceptance-criteria.md#ac-book-007) | T-015 | DB/هم‌زمانی؛ طراحی‌شده/اجرا نشده |
| FR-BOOK-008 | US-08 | [AC-BOOK-008](acceptance-criteria.md#ac-book-008) | T-016 | دامنه/API؛ طراحی‌شده/اجرا نشده |
| FR-CAL-002 | US-07 | [AC-CAL-002](acceptance-criteria.md#ac-cal-002) | T-017 | DB/E2E؛ طراحی‌شده/اجرا نشده |
| FR-CAL-003 | US-06 | [AC-CAL-003](acceptance-criteria.md#ac-cal-003) | T-018 | DB/هم‌زمانی؛ طراحی‌شده/اجرا نشده |
| FR-CAL-004 | US-07 | [AC-CAL-004](acceptance-criteria.md#ac-cal-004) | T-019 | E2E/مجوز؛ طراحی‌شده/اجرا نشده |
| FR-CRM-001 | US-09 | [AC-CRM-001](acceptance-criteria.md#ac-crm-001) | T-020 | مجوز/امنیت؛ طراحی‌شده/اجرا نشده |
| FR-NOT-001 | US-10 | [AC-NOT-001](acceptance-criteria.md#ac-not-001) | T-021 | DB/provider stub؛ طراحی‌شده/اجرا نشده |
| FR-NOT-002 | US-10 | [AC-NOT-002](acceptance-criteria.md#ac-not-002) | T-022 | worker/زمان؛ طراحی‌شده/اجرا نشده |
| FR-ADM-001 | US-11 | [AC-ADM-001](acceptance-criteria.md#ac-adm-001) | T-023 | امنیت/API؛ طراحی‌شده/اجرا نشده |
| FR-ADM-002 | US-11 | [AC-ADM-002](acceptance-criteria.md#ac-adm-002) | T-024 | امنیت/عملیاتی؛ طراحی‌شده/اجرا نشده |
| FR-BIZ-007 | US-12 | [AC-BIZ-007](acceptance-criteria.md#ac-biz-007) | T-025 | DB/API؛ طراحی‌شده/اجرا نشده |
| FR-LOC-001 | US-13 | [AC-LOC-001](acceptance-criteria.md#ac-loc-001) | T-026 | دامنه/E2E؛ طراحی‌شده/اجرا نشده |
| FR-REV-001 | US-14 | [AC-REV-001](acceptance-criteria.md#ac-rev-001) | T-027 | آینده؛ تعویق P1 |

## الزامات غیرعملکردی
| نیازمندی | داستان/ریسک | معیار | تست |
|---|---|---|---|
| NFR-SEC-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N01؛ اجرا نشده |
| NFR-SEC-002 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N02؛ اجرا نشده |
| NFR-SEC-003 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N03؛ اجرا نشده |
| NFR-SEC-004 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N04؛ اجرا نشده |
| NFR-DATA-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N05؛ اجرا نشده |
| NFR-PERF-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N06؛ اجرا نشده |
| NFR-UX-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N07؛ اجرا نشده |
| NFR-AVL-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N08؛ اجرا نشده |
| NFR-OPS-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N09؛ اجرا نشده |
| NFR-EXT-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N10؛ اجرا نشده |
| NFR-LOC-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N11؛ اجرا نشده |
| NFR-A11Y-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N12؛ اجرا نشده |
| NFR-PRIV-001 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N13؛ اجرا نشده |
| NFR-OPS-002 | US-02/03/10/11/13، ریسک‌های امنیت/صحت/عملیات | ردیف هم‌شناسه در NFR | T-N14؛ اجرا نشده |
