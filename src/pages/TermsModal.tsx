interface Props {
  onClose: () => void;
}

export default function TermsModal({ onClose }: Props) {
  return (
    <div className="terms-overlay" onClick={onClose}>
      <div className="terms-modal" onClick={e => e.stopPropagation()}>
        <div className="terms-header">
          <h2 className="terms-title">Terms &amp; Conditions</h2>
          <button className="admin-close" onClick={onClose}>×</button>
        </div>
        <div className="terms-body">
          <p className="terms-effective">Effective date: May 2026</p>

          <p>
            Welcome to <strong>Themoat</strong> ("the App"). By creating an account and
            using this App you agree to the following terms. Please read them carefully. If you do
            not agree, do not use the App.
          </p>

          <h3>1. Not Financial Advice</h3>
          <p>
            The App is an educational and informational tool only. Nothing presented — including
            scores, metrics, charts, valuations, or DCF models — constitutes financial, investment,
            tax, or legal advice. The App is not a registered investment adviser under any applicable
            law. You should consult a qualified financial adviser before making any investment
            decision. Past performance of any stock does not guarantee future results.
          </p>

          <h3>2. No Liability for Investment Decisions</h3>
          <p>
            To the fullest extent permitted by law, Themoat and its operators shall not
            be liable for any loss or damage — including investment losses — arising from your use of
            or reliance on information provided by the App. You bear sole responsibility for all
            investment decisions you make.
          </p>

          <h3>3. Data Accuracy</h3>
          <p>
            Financial data is sourced from third-party providers (currently Financial Modeling Prep).
            While we display this data in good faith, we make no warranty as to its accuracy,
            completeness, or timeliness. Data may contain errors, omissions, or delays. Always
            verify important figures from primary sources (SEC filings, company investor relations
            pages) before relying on them.
          </p>

          <h3>4. Your API Key</h3>
          <p>
            To use the App you must provide your own API key from Financial Modeling Prep ("FMP").
            You are solely responsible for (a) complying with FMP's Terms of Service, (b) any usage
            limits or costs associated with your key, and (c) keeping your key confidential. The App
            stores your key securely in our database solely to enable the service. Do not share your
            key with others.
          </p>

          <h3>5. Eligibility</h3>
          <p>
            You must be at least 18 years of age to use this App. By registering, you confirm that
            you meet this requirement.
          </p>

          <h3>6. Privacy &amp; Data</h3>
          <p>
            When you create an account we store your email address, watchlist tickers, and encrypted
            API key using Supabase. We do not sell your data to third parties. Your data is used
            solely to provide the service. You may request deletion of your account at any time by
            contacting the administrator.
          </p>

          <h3>7. Account Termination</h3>
          <p>
            The administrator reserves the right to suspend or remove any account at any time,
            without notice, for any reason including but not limited to misuse of the App or
            violation of these terms.
          </p>

          <h3>8. No Guarantee of Availability</h3>
          <p>
            The App is provided "as is." We do not guarantee uninterrupted availability. Data may
            be delayed or unavailable due to API rate limits, provider outages, or other factors
            outside our control.
          </p>

          <h3>9. Changes to These Terms</h3>
          <p>
            We may update these terms at any time. Continued use of the App after changes are posted
            constitutes your acceptance of the revised terms.
          </p>

          <h3>10. Governing Law</h3>
          <p>
            These terms are governed by the laws of the United States. Any disputes shall be resolved
            in accordance with applicable US law.
          </p>
        </div>
        <div className="terms-footer">
          <button className="auth-btn-primary" onClick={onClose} style={{ maxWidth: 200 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
