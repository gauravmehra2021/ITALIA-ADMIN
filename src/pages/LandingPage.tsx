import { useState } from 'react';
import { Link } from 'react-router-dom';
import { enquiriesApi } from '../services/platformApi';
import type { Enquiry } from '../types';
import './landing.css';

export function LandingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    interestedCourse: 'Italian Essentials A1',
    preferredLanguage: 'English',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<Enquiry | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await enquiriesApi.submit(formData);
      setSubmittedEnquiry(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed. Please check your details.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedEnquiry(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      interestedCourse: 'Italian Essentials A1',
      preferredLanguage: 'English',
      message: '',
    });
    setFormError(null);
  };

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-visual" aria-hidden>
          <div className="hero-photo" />
          <div className="hero-veil" />
          <div className="hero-grain" />
          <svg className="hero-arch" viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice">
            <path
              d="M0 420V260c40-18 70-54 110-54s68 32 108 32 72-40 118-40 78 48 126 48 84-56 128-56 84 42 120 42v188H0Z"
              fill="rgba(6,18,32,0.55)"
            />
            <path
              d="M0 420V300c48-12 82-40 124-40s70 28 112 28 76-36 120-36 80 40 128 40 86-44 130-44 90 34 126 34v98H0Z"
              fill="rgba(6,18,32,0.72)"
            />
          </svg>
          <div className="hero-light hero-light-a" />
          <div className="hero-light hero-light-b" />
        </div>

        <header className="landing-nav">
          <div className="brand landing-brand">SS Europa</div>
          <nav className="landing-links" aria-label="Primary">
            <a href="#experience">Experience</a>
            <a href="#roles">Roles</a>
            <a href="#languages">Languages</a>
            <a href="#contact">Contact Admissions</a>
          </nav>
          <div className="landing-nav-actions">
            <a className="btn btn-ghost" href="#contact">Enquire</a>
            <Link className="btn btn-light" to="/login">Enter platform</Link>
          </div>
        </header>

        <div className="hero-copy animate-rise">
          <p className="hero-kicker">Advanced AI-powered learning</p>
          <h1 className="brand hero-title">SS Europa</h1>
          <p className="hero-lead">
            A secure Italian learning platform with verified identity, live classes,
            protected materials, and guided AI practice.
          </p>
          <div className="hero-cta">
            <a className="btn btn-azure" href="#contact">Contact Admissions</a>
            <Link className="btn btn-outline-light" to="/login">Sign in</Link>
          </div>
        </div>
      </section>

      <section id="experience" className="experience">
        <div className="container experience-grid">
          <div className="experience-intro animate-rise">
            <p className="section-kicker">The experience</p>
            <h2>Built as one continuous learning journey</h2>
            <p>
              From first login to certificate, every step is authorized on the server —
              enrollment, class access, materials, assessments, and AI practice.
            </p>
          </div>

          <ol className="journey-list animate-rise-delay">
            <li>
              <span className="journey-index">01</span>
              <div>
                <h3>Live classes</h3>
                <p>Authorized Google Meet access with mentor-led attendance and schedule clarity.</p>
              </div>
            </li>
            <li>
              <span className="journey-index">02</span>
              <div>
                <h3>AI practice studio</h3>
                <p>Tutor, translator, conversation, speaking, and personalized drills through the API.</p>
              </div>
            </li>
            <li>
              <span className="journey-index">03</span>
              <div>
                <h3>Secure learning access</h3>
                <p>JWT sessions, OTP challenges, and one-active-device controls for every student.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section id="roles" className="roles">
        <div className="container roles-panel animate-rise">
          <div className="roles-copy">
            <p className="section-kicker">Role-aware platform</p>
            <h2>Tailored workspaces for your entire team.</h2>
            <p>
              Prospective students enquire. Staff qualify leads. Mentors teach. Admins manage operations.
              Super admins govern security and audit trails.
            </p>
            <Link className="btn btn-primary" to="/login">Open your workspace</Link>
          </div>
          <div className="roles-visual" aria-hidden>
            <div className="role-lane" style={{ ['--delay' as string]: '0ms' }}>Student · courses · progress · AI</div>
            <div className="role-lane" style={{ ['--delay' as string]: '80ms' }}>Mentor · classes · attendance · materials</div>
            <div className="role-lane" style={{ ['--delay' as string]: '160ms' }}>Staff · admissions · enquiries · lead conversion</div>
            <div className="role-lane" style={{ ['--delay' as string]: '240ms' }}>Admin · catalogue · payments · support</div>
            <div className="role-lane" style={{ ['--delay' as string]: '320ms' }}>Super Admin · security · audit · platform</div>
          </div>
        </div>
      </section>

      <section id="languages" className="languages">
        <div className="container languages-inner animate-rise">
          <h2>Italian first. Multilingual ready.</h2>
          <p>Interface support designed for Italian, English, Punjabi, Hindi, and Urdu learners.</p>
          <div className="lang-row" aria-label="Supported languages">
            <span>Italiano</span>
            <span>English</span>
            <span>ਪੰਜਾਬੀ</span>
            <span>हिन्दी</span>
            <span>اردو</span>
          </div>
        </div>
      </section>

      {/* ——— Contact & Admissions Form Section ——— */}
      <section id="contact" className="contact-section">
        <div className="container contact-grid">
          <div className="contact-info">
            <p className="section-kicker">Admissions & Information</p>
            <h2>Get in touch with our team</h2>
            <p>
              Have questions about batch timings, visa preparations, or which Italian level fits your goals?
              Submit your enquiry below and our dedicated admissions advisors will reach out to you directly.
            </p>

            <ul className="contact-highlights">
              <li>
                <span className="contact-icon-pill">✓</span>
                <div>
                  <strong>Personalized Level Placement:</strong> We evaluate your current Italian proficiency and recommend the ideal cohort.
                </div>
              </li>
              <li>
                <span className="contact-icon-pill">✓</span>
                <div>
                  <strong>Flexible Timings:</strong> Weekday evening and weekend batches for working professionals and students abroad.
                </div>
              </li>
              <li>
                <span className="contact-icon-pill">✓</span>
                <div>
                  <strong>Direct WhatsApp & Phone Support:</strong> Speak with a counselor in English, Italian, Punjabi, or Hindi.
                </div>
              </li>
            </ul>

            <div className="contact-direct-card">
              <h4>Admissions Desk</h4>
              <div className="contact-direct-item">
                <span>📧</span>
                <span>Email: <strong>admissions@sseuropa.demo</strong></span>
              </div>
              <div className="contact-direct-item">
                <span>💬</span>
                <span>WhatsApp: <strong>+39 02 8765 4321</strong></span>
              </div>
              <div className="contact-direct-item">
                <span>📍</span>
                <span>Campus & HQ: <strong>Milan, Italy</strong></span>
              </div>
            </div>
          </div>

          <div className="contact-form-card">
            {submittedEnquiry ? (
              <div className="enquiry-success-panel animate-rise">
                <div className="enquiry-success-icon">✓</div>
                <h3>Enquiry Received!</h3>
                <p>
                  Thank you, <strong>{submittedEnquiry.fullName}</strong>. Our admissions counselor
                  will review your enquiry regarding <strong>{submittedEnquiry.interestedCourse}</strong> and
                  contact you shortly on your phone/email.
                </p>
                <div className="enquiry-meta-badge">
                  Reference: {submittedEnquiry.id.slice(0, 8).toUpperCase()}
                </div>
                <button
                  type="button"
                  className="btn btn-azure"
                  style={{ marginTop: '0.75rem' }}
                  onClick={handleReset}
                >
                  Submit another enquiry
                </button>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--ink)' }}>
                  Enquire about Courses & Admissions
                </h3>

                {formError && (
                  <div
                    style={{
                      background: 'rgba(180, 35, 24, 0.08)',
                      border: '1px solid rgba(180, 35, 24, 0.25)',
                      color: 'var(--danger)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.88rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="form-row-duo">
                  <div className="form-field">
                    <label htmlFor="fullName">Full Name *</label>
                    <input
                      id="fullName"
                      required
                      placeholder="e.g. Marco Bellini"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      id="email"
                      type="email"
                      required
                      placeholder="e.g. marco@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row-duo">
                  <div className="form-field">
                    <label htmlFor="phone">Phone / WhatsApp *</label>
                    <input
                      id="phone"
                      required
                      placeholder="e.g. +39 347 123 4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label htmlFor="preferredLanguage">Preferred Language</label>
                    <select
                      id="preferredLanguage"
                      value={formData.preferredLanguage}
                      onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value })}
                    >
                      <option value="Italian">Italian (Italiano)</option>
                      <option value="English">English</option>
                      <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                      <option value="Urdu">Urdu (اردو)</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="interestedCourse">Course of Interest *</label>
                  <select
                    id="interestedCourse"
                    required
                    value={formData.interestedCourse}
                    onChange={(e) => setFormData({ ...formData, interestedCourse: e.target.value })}
                  >
                    <option value="Italian Essentials A1">Italian Essentials A1 (Beginners)</option>
                    <option value="A2 Elementary Communication">A2 Elementary Communication</option>
                    <option value="B1 Conversational Fluency">B1 Conversational Fluency (Citizenship / Work)</option>
                    <option value="B2 Upper-Intermediate Italian">B2 Upper-Intermediate Italian</option>
                    <option value="Medical & Workplace Italian">Medical & Professional Workplace Italian</option>
                    <option value="General Enquiry / Placement Guidance">General Enquiry / Placement Guidance</option>
                  </select>
                </div>

                <div className="form-field">
                  <label htmlFor="message">Your Message or Question *</label>
                  <textarea
                    id="message"
                    required
                    rows={3}
                    placeholder="Tell us about your learning goals, current location, preferred timing, or any specific questions..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="form-submit-btn"
                >
                  {submitting ? 'Submitting enquiry...' : 'Send Admissions Enquiry →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container footer-row">
          <div className="brand">SS Europa</div>
          <p>Prototype LMS with admissions CRM, live classes, and AI tutor.</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a className="btn btn-ghost" href="#contact">Contact</a>
            <Link className="btn btn-azure" to="/login">Enter platform</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

