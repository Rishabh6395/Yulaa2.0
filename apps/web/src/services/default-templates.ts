export const DEFAULT_FEE_INVOICE_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Fee Invoice — @@invoice_no@@</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #1a1a2e; background: #fff; }
  .page { max-width: 794px; margin: 0 auto; padding: 32px; }

  /* Header */
  .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 24px; border-bottom: 3px solid #4f46e5; margin-bottom: 28px; }
  .school-info { flex: 1; }
  .school-logo { max-height: 64px; max-width: 120px; object-fit: contain; margin-bottom: 8px; display: block; }
  .school-name { font-size: 22px; font-weight: 700; color: #4f46e5; letter-spacing: -0.3px; }
  .school-meta { margin-top: 6px; font-size: 11.5px; color: #555; line-height: 1.7; }
  .invoice-badge { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: 1px; text-transform: uppercase; }
  .invoice-number { font-size: 13px; color: #666; margin-top: 4px; }
  .badge-status { display: inline-block; margin-top: 10px; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge-paid { background: #d1fae5; color: #065f46; }
  .badge-unpaid { background: #fee2e2; color: #991b1b; }
  .badge-overdue { background: #fff7ed; color: #92400e; }
  .badge-partial { background: #fef3c7; color: #92400e; }

  /* Two-col info row */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .info-box { background: #f8f9ff; border: 1px solid #e8eaff; border-radius: 10px; padding: 16px 18px; }
  .info-box-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4f46e5; margin-bottom: 10px; }
  .info-row { display: flex; justify-content: space-between; font-size: 12.5px; margin-bottom: 5px; }
  .info-label { color: #666; }
  .info-value { font-weight: 600; color: #1a1a2e; text-align: right; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead tr { background: #4f46e5; color: #fff; }
  thead th { padding: 11px 14px; text-align: left; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr:nth-child(even) { background: #fafafa; }
  tbody td { padding: 12px 14px; font-size: 12.5px; color: #333; }
  tbody td:last-child { text-align: right; font-weight: 600; }

  /* Summary */
  .summary { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .summary-box { width: 280px; }
  .summary-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
  .summary-row.total { border-top: 2px solid #4f46e5; border-bottom: none; padding-top: 10px; margin-top: 4px; }
  .summary-row.total .summary-label { font-weight: 700; font-size: 14px; color: #1a1a2e; }
  .summary-row.total .summary-value { font-weight: 800; font-size: 16px; color: #4f46e5; }
  .summary-label { color: #555; }
  .summary-value { font-weight: 600; color: #1a1a2e; }
  .summary-value.green { color: #059669; }
  .summary-value.red { color: #dc2626; }

  /* Notes */
  .notes { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 12px; color: #78350f; }
  .notes-title { font-weight: 700; margin-bottom: 4px; }

  /* Footer */
  .footer { border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer-left { font-size: 11px; color: #888; line-height: 1.7; }
  .footer-right { text-align: right; font-size: 11px; color: #888; }
  .powered { font-size: 10px; color: #aaa; margin-top: 4px; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="school-info">
      <div class="school-name">@@school_name@@</div>
      <div class="school-meta">
        @@school_address@@<br/>
        @@school_city@@<br/>
        @@school_phone@@ &nbsp;·&nbsp; @@school_email@@
      </div>
    </div>
    <div class="invoice-badge">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-number"># @@invoice_no@@</div>
      <span class="badge-status badge-@@status@@">@@status@@</span>
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-box">
      <div class="info-box-title">Billed To</div>
      <div class="info-row"><span class="info-label">Student</span><span class="info-value">@@student_name@@</span></div>
      <div class="info-row"><span class="info-label">Admission No.</span><span class="info-value">@@student_admission_no@@</span></div>
      <div class="info-row"><span class="info-label">Class</span><span class="info-value">@@student_class@@</span></div>
      <div class="info-row"><span class="info-label">Grade / Section</span><span class="info-value">@@student_grade@@ – @@student_section@@</span></div>
      <div class="info-row"><span class="info-label">Academic Year</span><span class="info-value">@@academic_year@@</span></div>
    </div>
    <div class="info-box">
      <div class="info-box-title">Invoice Details</div>
      <div class="info-row"><span class="info-label">Invoice No.</span><span class="info-value">@@invoice_no@@</span></div>
      <div class="info-row"><span class="info-label">Invoice Date</span><span class="info-value">@@invoice_date@@</span></div>
      <div class="info-row"><span class="info-label">Due Date</span><span class="info-value">@@due_date@@</span></div>
      <div class="info-row"><span class="info-label">Installment</span><span class="info-value">@@installment_no@@</span></div>
      <div class="info-row"><span class="info-label">Generated</span><span class="info-value">@@generated_date@@</span></div>
    </div>
  </div>

  <!-- Fee table -->
  <table>
    <thead>
      <tr>
        <th style="width:50px">#</th>
        <th>Description</th>
        <th style="width:120px">Installment</th>
        <th style="width:120px">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>@@description@@</td>
        <td>Installment @@installment_no@@</td>
        <td>₹@@amount@@</td>
      </tr>
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary">
    <div class="summary-box">
      <div class="summary-row">
        <span class="summary-label">Subtotal</span>
        <span class="summary-value">₹@@amount@@</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Amount Paid</span>
        <span class="summary-value green">– ₹@@paid_amount@@</span>
      </div>
      <div class="summary-row total">
        <span class="summary-label">Balance Due</span>
        <span class="summary-value red">₹@@balance_due@@</span>
      </div>
    </div>
  </div>

  <!-- Notes -->
  <div class="notes">
    <div class="notes-title">Payment Instructions</div>
    Please make payment before the due date to avoid late charges. For any queries regarding this invoice, contact the school accounts department.
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">
      <strong>@@school_name@@</strong><br/>
      @@school_address@@, @@school_city@@<br/>
      @@school_email@@ &nbsp;·&nbsp; @@school_website@@
    </div>
    <div class="footer-right">
      Generated on @@generated_date@@<br/>
      by @@generated_by@@
      <div class="powered">Powered by Yulaa</div>
    </div>
  </div>

</div>
</body>
</html>`;

export const TEMPLATE_TYPES = [
  { value: 'fee_invoice', label: 'Fee Invoice' },
  { value: 'letter',      label: 'General Letter' },
  { value: 'receipt',     label: 'Payment Receipt' },
] as const;
