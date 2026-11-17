'use client';

import { useState } from 'react';
import { Button, Card, CardHeader, InfoBanner, InputField, PageHeader, Textarea, useToast } from '@collabrium/ui';
import { AddressBook } from '@phosphor-icons/react';
import { SiteShell } from '@/components/SiteShell';
import { getBrowserClient } from '@/lib/supabase/browser';
import type { SiteSettings } from '@/lib/types';
import styles from './contact.module.css';

type Errors = Partial<Record<'name' | 'email' | 'message', string>>;

const EMPTY = { name: '', company: '', email: '', message: '' };

export function ContactView({ settings }: { settings: SiteSettings }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k as keyof Errors]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = 'Add your name so we know who to reply to';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Enter an email like name@company.com';
    if (form.message.trim().length < 10) e.message = 'Tell us a little more, at least 10 characters';
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`contact-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    const sb = getBrowserClient();
    if (!sb) {
      toast({ tone: 'warning', title: 'Not connected yet', message: 'Connect Supabase to save enquiries.' });
      return;
    }
    setSending(true);
    const { error } = await sb.from('enquiries').insert({
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim(),
      message: form.message.trim(),
    });
    setSending(false);
    if (error) {
      toast({ tone: 'danger', title: "We couldn't send that", message: 'Please try again in a minute.' });
      return;
    }
    setForm(EMPTY);
    setSent(true);
    toast({ tone: 'success', title: 'Enquiry sent', message: "Thanks. We'll be in touch soon." });
  };

  const hasContact = settings.contact_email || settings.contact_phone || settings.contact_address;

  return (
    <SiteShell
      width="reading"
      header={
        <PageHeader
          title="Work with us"
          subtitle="Tell us about your brief. We'll reply with how AI can help and what it takes."
        />
      }
    >
      <div className={styles.layout}>
        <form className={styles.form} onSubmit={submit} noValidate>
          {sent && (
            <InfoBanner tone="success" dismissible onDismiss={() => setSent(false)}>
              Got it. Your enquiry is with the team, and we&apos;ll reply by email.
            </InfoBanner>
          )}
          <InputField id="contact-name" label="Your name" required value={form.name} onChange={set('name')} error={errors.name} autoComplete="name" />
          <InputField id="contact-company" label="Company" value={form.company} onChange={set('company')} autoComplete="organization" />
          <InputField
            id="contact-email"
            type="email"
            label="Email"
            required
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            autoComplete="email"
          />
          <Textarea
            id="contact-message"
            label="What are you making?"
            helper="The brief, the timeline, the formats you need"
            required
            rows={6}
            maxLength={5000}
            value={form.message}
            onChange={set('message')}
            error={errors.message}
          />
          <div>
            <Button variant="primary" type="submit" loading={sending}>
              Send enquiry
            </Button>
          </div>
        </form>

        {hasContact && (
          <Card surface="warm">
            <CardHeader icon={AddressBook} element="fire" title="Reach us directly" />
            <dl className={styles.details}>
              {settings.contact_email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a>
                  </dd>
                </>
              )}
              {settings.contact_phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${settings.contact_phone.replace(/\s/g, '')}`}>{settings.contact_phone}</a>
                  </dd>
                </>
              )}
              {settings.contact_address && (
                <>
                  <dt>Studio</dt>
                  <dd>{settings.contact_address}</dd>
                </>
              )}
            </dl>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}
