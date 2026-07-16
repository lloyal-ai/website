import { useState } from 'react';

const PARTNER_EMAIL = 'zuhair@lloyal.ai';

const INITIAL_FORM = {
  company: '',
  name: '',
  email: '',
  capability: '',
  placement: '',
};

// React-controlled port of the prototype's app.js `[data-partner-form]` submit
// handler — assembles the same subject/body and opens the same mailto link.
const PartnerForm = () => {
  const [form, setForm] = useState(INITIAL_FORM);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { company, name, email, capability, placement } = form;
    const subject = `Lloyal product capability — ${company || 'product discussion'}`;
    const body = [
      `Company: ${company}`,
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      'What the product should be able to do:',
      capability,
      '',
      'Required placements:',
      placement,
    ].join('\n');
    window.location.href = `mailto:${PARTNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="partner-form reveal" id="partner-form" onSubmit={handleSubmit}>
      <label>
        Company
        <input autoComplete="organization" name="company" required value={form.company} onChange={handleChange} />
      </label>
      <label>
        Your name
        <input autoComplete="name" name="name" required value={form.name} onChange={handleChange} />
      </label>
      <label>
        Email
        <input autoComplete="email" name="email" required type="email" value={form.email} onChange={handleChange} />
      </label>
      <label>
        What should your product be able to do?
        <textarea name="capability" required rows={4} value={form.capability} onChange={handleChange} />
      </label>
      <label>
        Where must it run?
        <input
          name="placement"
          placeholder="e.g. desktop, customer VPC and hosted GPU"
          value={form.placement}
          onChange={handleChange}
        />
      </label>
      <button className="button button-light" type="submit">
        Build with Lloyal
      </button>
      <p className="form-note">Opens a prepared email to Zuhair. No CRM or tracking layer is attached to this prototype.</p>
    </form>
  );
};

export default PartnerForm;
